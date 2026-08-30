/*
	ts_bot.qc — KI-Mitspieler

	Wer allein spielt, hat kein Netz: geht man zu Boden, ist ohne Quick Revive
	Schluss (LastStand_Begin, damage.qc). Ein Bot, der einen aufhebt, nimmt
	genau diese Klippe weg — und macht Koop spielbar, wenn gerade niemand da
	ist.

	DREI ENTSCHEIDUNGEN, die den Rest erklaeren:

	1. Bots sind ECHTE Clients (spawnclient, #454). Damit zaehlen sie in
	   player_count, stehen auf der Punktetafel, bekommen Startpunkte und
	   erscheinen im Marker TSUI:mprow. Sie sind kein Sonderfall, den jede
	   andere Stelle kennen muesste.

	   Die Kehrseite, und sie ist der Grund fuer Punkt 2: an player_count
	   haengt die ZOMBIEZAHL ((player_count - 1) * 6, rounds.qc). Ein Bot, der
	   nicht kaempft, macht das Spiel also SCHWERER statt leichter.

	2. Sie kaempfen deshalb wirklich — mit traceline, TraceAttack UND
	   Parse_Damage, demselben Weg, den eine echte Kugel nimmt (FireTrace ruft
	   die beiden ebenfalls nacheinander). TraceAttack allein richtet KEINEN
	   Schaden an: es bucht ihn auf `hitamount` und setzt `washit`, eingeloest
	   wird er erst von Parse_Damage. Ohne die zweite Zeile traf der Bot
	   sauber und der Zombie blieb bei vollem Leben. So stimmen Kopfschuesse,
	   Blut, Punkte und Erfolge, ohne dass ein zweiter Schadenspfad entsteht;
	   TraceAttack nimmt `self` als Angreifer, der Bot muss also selbst
	   schiessen, nicht jemand in seinem Namen.

	3. Sie bewegen sich mit movetogoal (#67), der klassischen
	   Quake-Monsterbewegung. Die Wegfindung der Zombies ist an Barrikaden und
	   goalentity gebunden und laesst sich nicht allgemein benutzen; fuer
	   Karten dieser Groesse reicht movetogoal.

	EHRLICH DAZU: ein Bot spielt nicht wie ein Mensch. Er kauft nichts, oeffnet
	keine Tueren, holt keine Powerups und sucht sich keine Position. Er folgt,
	schiesst, und hebt dich auf. Das ist bewusst der Zuschnitt — lieber drei
	Dinge verlaesslich als zehn halb.

	Gesteuert ueber die Cvar `ts_bots` (0..3) — eine Cvar, weil die Web-Shell
	Cvars schreiben kann und sonst nichts. Sie tut das bei jedem TSUI:game aus
	ihrem localStorage; wer den Wert per Konsole setzt, wird davon still
	ueberschrieben (Footgun 40). Ob eigene QuakeC-Konsolenkommandos in diesem
	Build ankommen, ist weiterhin UNGEPRUEFT (Footgun 29) — hier wurde es
	deshalb gar nicht erst darauf angelegt.
*/

// KI-Mitspieler gibt es nur im FTE-Zweig. spawnclient (#454), dropclient
// (#453), forceinfokey und sprintf sind FTE-Erweiterungen; der Vril-/Standard-
// Zweig, den tools/build-progs.sh als VIERTES Ziel baut, kennt sie nicht und
// brach hier ab -- und weil das Skript die Compilermeldung schluckt (CLAUDE.md),
// sah es aus wie ein gruener Build, waehrend progs.pk3 unangetastet blieb und
// jeder Test gegen den Stand vom Vortag lief. Die Klammer ist also nicht
// Kosmetik: ohne sie liefert das ganze Projekt keinen neuen Gamecode mehr aus.
#ifdef FTE

.float ts_bot_denkzeit;      // naechster Entscheidungszeitpunkt
.float ts_bot_schusszeit;    // naechster Schuss
.float ts_bot_meldung;       // Drossel fuer ts_bot_debug

// Namen mit erkennbarem Praefix. Ein Mitspieler, der in Wahrheit ein Programm
// ist, gehoert gekennzeichnet -- alles andere waere eine Taeuschung, und auf
// der Punktetafel steht er neben echten Leuten.
string ts_bot_namen[6] = {
	"Bot-Nordwind", "Bot-Kurzwelle", "Bot-Totmann",
	"Bot-Relais",   "Bot-Trabant",   "Bot-Nachtwache"
};

float ts_bot_letzte_meldung;
float ts_bot_sperre;

float TS_BOT_SICHT       = 900;   // so weit sieht ein Bot
float TS_BOT_FOLGEABSTAND = 140;  // naeher als das laeuft er dem Menschen nicht auf
float TS_BOT_NAHKAMPF    = 150;   // ab hier weicht er zurueck statt zu stehen
float TS_BOT_ANGRIFF     = 320;   // weiter weg geht er auf den Zombie zu
float TS_BOT_TEMPO       = 200;
float TS_BOT_WEICHEN     = 190;
float TS_BOT_SCHADEN     = 42;    // je Schuss; grob eine Kar98k ohne Kopftreffer
float TS_BOT_FEUERPAUSE  = 0.55;  // Sekunden zwischen zwei Schuessen

//
// TS_Bot_NaechsterMensch()
// Der naechste echte Spieler. Bots folgen Menschen, nicht einander -- sonst
// stehen zwei Bots im Kreis und niemand geht irgendwohin.
//
entity(entity bot) TS_Bot_NaechsterMensch =
{
	entity gefunden = world;
	float beste = 1000000;
	entity e = find(world, classname, "player");
	while (e) {
		if (e != bot && !e.ts_ist_bot) {
			float d = vlen(e.origin - bot.origin);
			if (d < beste) { beste = d; gefunden = e; }
		}
		e = find(e, classname, "player");
	}
	return gefunden;
};

//
// TS_Bot_NaechsterGefallener()
// Ein Mensch am Boden schlaegt alles andere. Bots heben sich NICHT gegenseitig
// auf: sonst kann eine Runde ohne Zutun des Spielers ewig weiterlaufen, und
// der Bot waere kein Helfer mehr, sondern ein Ersatz.
//
entity(entity bot) TS_Bot_NaechsterGefallener =
{
	entity gefunden = world;
	float beste = 1000000;
	entity e = find(world, classname, "player");
	while (e) {
		if (e != bot && !e.ts_ist_bot && e.downed) {
			float d = vlen(e.origin - bot.origin);
			if (d < beste) { beste = d; gefunden = e; }
		}
		e = find(e, classname, "player");
	}
	return gefunden;
};

//
// TS_Bot_NaechsterZombie()
// Nur was zu sehen ist. Ohne Sichtpruefung schiesst ein Bot durch Waende --
// das faellt sofort auf und nimmt dem Spiel seine Spannung.
//
entity(entity bot) TS_Bot_NaechsterZombie =
{
	entity gefunden = world;
	float beste = TS_BOT_SICHT;
	entity e = find(world, classname, "ai_zombie");
	while (e) {
		if (e.health > 0) {
			float d = vlen(e.origin - bot.origin);
			if (d < beste) {
				traceline(bot.origin + bot.view_ofs, e.origin + '0 0 24', TRUE, bot);
				if (trace_fraction == 1 || trace_ent == e) { beste = d; gefunden = e; }
			}
		}
		e = find(e, classname, "ai_zombie");
	}
	return gefunden;
};

//
// TS_Bot_Blicken(bot, ziel)
// v_angle setzen, nicht nur angles: PlayerIsLooking rechnet mit v_angle.
//
void(entity bot, vector ziel) TS_Bot_Blicken =
{
	vector d = ziel - (bot.origin + bot.view_ofs);
	vector w = vectoangles(d);
	// vectoangles gibt das Nicken positiv nach OBEN, makevectors (und damit
	// PlayerIsLooking) liest es positiv nach UNTEN. Ohne das Vorzeichen schaute
	// der Bot um genau denselben Winkel in die falsche Richtung: er stand 38
	// Einheiten neben dem Gefallenen, hielt AKTION gedrueckt -- und der
	// Ausloeser sah ihn nie hinsehen. Beim Schiessen faellt es nicht auf, das
	// rechnet seine Richtung selbst aus.
	w_x = w_x * -1;
	bot.v_angle = w;
	bot.angles_y = w_y;
	bot.angles_x = 0;
	bot.angles_z = 0;
	bot.fixangle = TRUE;
};

//
// TS_Bot_Schiessen(bot, ziel)
// Derselbe Weg wie eine echte Kugel: traceline, dann TraceAttack mit dem Bot
// als `self`. Kopfschuesse, Blut, Punkte und Erfolge verhalten sich dadurch
// genau wie beim Menschen -- ein zweiter Schadenspfad waere eine Quelle
// stiller Abweichungen.
//
void(entity bot, entity ziel) TS_Bot_Schiessen =
{
	if (time < bot.ts_bot_schusszeit)
		return;
	bot.ts_bot_schusszeit = time + TS_BOT_FEUERPAUSE;

	vector quelle = bot.origin + bot.view_ofs;
	vector richtung = normalize((ziel.origin + '0 0 20') - quelle);

	traceline(quelle, quelle + richtung * TS_BOT_SICHT, FALSE, bot);
	if (trace_fraction == 1.0)
		return;

	entity alt = self;
	self = bot;
	TraceAttack(TS_BOT_SCHADEN, richtung, trace_endpos, trace_plane_normal, trace_ent, 0);
	// TraceAttack richtet KEINEN Schaden an -- es bucht ihn auf `hitamount` und
	// setzt `washit`. Erst Parse_Damage() sammelt alle so markierten Ziele ein
	// und ruft DamageHandler. Ohne diese Zeile traf der Bot sauber (frac=0.05,
	// takedamage=1) und der Zombie blieb bei 150 Leben. Der normale Schusspfad
	// ruft beides ebenfalls nacheinander (FireTrace).
	Parse_Damage();
	self = alt;


};

//
// TS_Bot_Weichen(bot, weg)
// Rueckwaerts aus dem Nahbereich. Ohne das lief der Bot in die Horde hinein,
// ging vor dem Gefallenen zu Boden -- und dann war NIEMAND mehr auf den Beinen,
// die Runde endete regelkonform (PollPlayersAlive) und der Bot hatte das Spiel
// verkuerzt statt verlaengert. Am Bild gesehen, nicht erschlossen.
//
void(entity bot, entity weg) TS_Bot_Weichen =
{
	float gier = vectoyaw(bot.origin - weg.origin);
	// walkmove rechnet mit `self`; das setzt TS_Bot_Abgleich. Blockiert die Wand
	// den geraden Rueckweg, wird schraeg ausgewichen -- sonst klebt der Bot fest.
	if (!walkmove(gier, TS_BOT_WEICHEN * frametime, FALSE))
		if (!walkmove(gier + 55, TS_BOT_WEICHEN * frametime, FALSE))
			walkmove(gier - 55, TS_BOT_WEICHEN * frametime, FALSE);
};

//
// TS_Bot_Denken(bot)
// Eine Entscheidung je Zehntelsekunde.
//
// SCHIESSEN UND GEHEN SIND GETRENNT. Die erste Fassung war eine Rangfolge mit
// `return` nach jedem Zweig: wer jemanden aufheben wollte, hoerte auf zu
// schiessen. Genau daran ist er gestorben. Jetzt feuert er immer, wenn etwas in
// Sicht ist (eigene Abklingzeit), und entscheidet davon unabhaengig, wohin er
// geht. Nur der BLICK bleibt eine Rangfolge -- an ihm haengt PlayerIsLooking,
// und ohne ihn gibt es keine Wiederbelebung.
//
void(entity bot) TS_Bot_Denken =
{
	if (bot.downed || bot.health <= 0)
		return;

	// button7 immer erst loslassen: gehalten bliebe er sonst ueber Situationen
	// hinweg stehen und der Bot "benutzt" alles, woran er vorbeilaeuft.
	bot.button7 = FALSE;

	entity gefallen = TS_Bot_NaechsterGefallener(bot);
	entity zombie   = TS_Bot_NaechsterZombie(bot);

	if (zombie != world)
		TS_Bot_Schiessen(bot, zombie);

	if (gefallen != world)
		// Auf den URSPRUNG zielen, nicht darueber: ein Gefallener liegt flach
		// (Player_SetStance PRONE), seine Box ist niedrig. Mit '0 0 16' ging der
		// 50-Einheiten-Strahl von PlayerIsLooking bei 33 Einheiten Abstand
		// gemessen acht Einheiten UEBER ihm vorbei -- der Bot stand daneben,
		// hielt AKTION, und der Ausloeser sah ihn nie hinsehen.
		TS_Bot_Blicken(bot, gefallen.origin);
	else if (zombie != world)
		TS_Bot_Blicken(bot, zombie.origin + '0 0 20');

	if (gefallen != world) {
		float ab = vlen(gefallen.origin - bot.origin);
		// PlayerIsLooking traced 50 Einheiten weit -- naeher als das muss der
		// Bot heran, sonst greift der Wiederbeleben-Ausloeser nie.
		if (ab > 40) {
			bot.goalentity = gefallen;
			movetogoal(TS_BOT_TEMPO * frametime);
		} else {
			bot.button7 = TRUE;       // halten, bis der Ausloeser fertig ist
			// Weiter anschubsen. Die ganze Wiederbelebung -- Fortschritt,
			// Abbruch, Abschluss -- steckt in LastStand_TouchReviveTrigger,
			// einer BERUEHRUNGSfunktion. Ein stehender MOVETYPE_STEP-Koerper
			// bewegt sich nicht, wird nicht neu verknuepft und beruehrt darum
			// nichts mehr: der Bot stand daneben, hielt die Taste, und nach
			// vier Sekunden passierte nichts, weil niemand mehr nachsah.
			walkmove(bot.angles_y, 2, FALSE);
		}

		if (cvar("ts_bot_debug") && time > bot.ts_bot_meldung) {
			bot.ts_bot_meldung = time + 1;
			bprint(PRINT_HIGH, sprintf("TSBOT hilft: ab=%d taste=%d blick=%d\n",
				ab, bot.button7, PlayerIsLooking(bot, gefallen)));
		}
		return;
	}

	if (zombie != world) {
		float zd = vlen(zombie.origin - bot.origin);
		if (zd < TS_BOT_NAHKAMPF)
			TS_Bot_Weichen(bot, zombie);
		else if (zd > TS_BOT_ANGRIFF) {
			bot.goalentity = zombie;
			movetogoal(TS_BOT_TEMPO * frametime);
		}

		if (cvar("ts_bot_debug") && time > bot.ts_bot_meldung) {
			bot.ts_bot_meldung = time + 1;
			bprint(PRINT_HIGH, sprintf("TSBOT kaempft: dist=%d hp=%d\n", zd, bot.health));
		}
		return;
	}

	entity mensch = TS_Bot_NaechsterMensch(bot);
	if (mensch != world) {
		if (vlen(mensch.origin - bot.origin) > TS_BOT_FOLGEABSTAND) {
			TS_Bot_Blicken(bot, mensch.origin);
			bot.goalentity = mensch;
			movetogoal(TS_BOT_TEMPO * frametime);
		}
	}
};

//
// TS_Bot_FreierName()
// Der erste Name, den noch niemand traegt. Zufaellig zu ziehen reichte nicht:
// bei sechs Namen und drei Bots kollidiert das in fast der Haelfte aller
// Runden, und zwei gleiche Zeilen auf der Punktetafel sind kein Schoenheits-
// fehler -- man kann dann nicht mehr sagen, wer wen aufgehoben hat. (Dieselbe
// Falle wie frueher bei zwei Spielern namens "Ueberlebender".)
//
string() TS_Bot_FreierName =
{
	float i = 0;
	while (i < 6) {
		float frei = TRUE;
		entity e = find(world, classname, "player");
		while (e) {
			if (e.netname == ts_bot_namen[i]) { frei = FALSE; e = world; }
			else e = find(e, classname, "player");
		}
		if (frei) return ts_bot_namen[i];
		i = i + 1;
	}
	return ts_bot_namen[0];   // mehr Bots als Namen kann es nicht geben (max 3)
};

//
// TS_Bot_Spawnen()
// spawnclient() liefert einen freien Clientplatz. ClientConnect und
// PutClientInServer ruft die Engine dafuer NICHT selbst -- das gehoert hierher.
//
float() TS_Bot_Spawnen =
{
	entity b = spawnclient();
	if (b == world)
		return FALSE;              // kein Platz frei (maxclients)

	entity alt = self;
	self = b;

	self.ts_ist_bot = TRUE;
	self.netname = TS_Bot_FreierName();
	forceinfokey(self, "name", self.netname);

	ClientConnect();
	PutClientInServer();

	// STEP statt WALK: movetogoal braucht es, und ohne Eingabepakete laeuft
	// fuer einen Bot ohnehin keine Spielerphysik.
	self.movetype = MOVETYPE_STEP;

	self = alt;
	return TRUE;
};

//
// TS_Bot_Entfernen()
// Einen beliebigen Bot wieder loswerden.
//
float() TS_Bot_Entfernen =
{
	entity e = find(world, classname, "player");
	while (e) {
		if (e.ts_ist_bot) { dropclient(e); return TRUE; }
		e = find(e, classname, "player");
	}
	return FALSE;
};

//
// TS_Bot_Abgleich()
// Aus StartFrame. Gleicht die Zahl der Bots an ts_bots an und laesst jeden
// denken. Hoechstens EINE Aenderung je Frame -- ein Schwung spawnclient() in
// einem Frame ist der sichere Weg zu einem Ruckler.
//
void() TS_Bot_Abgleich =
{
	float gewuenscht = cvar("ts_bots");
	if (gewuenscht > 3) gewuenscht = 3;
	if (gewuenscht < 0) gewuenscht = 0;

	float da = 0;
	entity e = find(world, classname, "player");
	while (e) {
		if (e.ts_ist_bot) {
			da = da + 1;
			if (time >= e.ts_bot_denkzeit) {
				e.ts_bot_denkzeit = time + 0.1;
				entity alt = self;
				self = e;
				TS_Bot_Denken(e);
				self = alt;
			}
		}
		e = find(e, classname, "player");
	}

	// Messfenster fuer ts_bot_debug. Steht hier, weil genau diese vier Zahlen
	// die vier moeglichen Ursachen trennen, wenn kein Bot erscheint: Cvar nicht
	// angekommen, Platz voll, Runde laeuft noch nicht, oder der Abgleich wird
	// gar nicht gerufen.
	if (cvar("ts_bot_debug") && time > ts_bot_letzte_meldung) {
		ts_bot_letzte_meldung = time + 2;
		bprint(PRINT_HIGH, sprintf("TSBOT gewuenscht=%d da=%d rounds=%d maxclients=%d\n",
			gewuenscht, da, rounds, cvar("maxclients")));
	}

	ts_bot_da = da;

	// Erst spawnen, wenn die Runde laeuft: waehrend der Lobby wuerde ein Bot
	// mitzaehlen, bevor der Gastgeber ueberhaupt gestartet hat.
	if (gewuenscht > da && rounds > 0 && time > ts_bot_sperre) {
		float ok = TS_Bot_Spawnen();
		// Kein Platz mehr (maxclients voll, etwa weil Menschen beigetreten
		// sind): dann nicht in jedem Frame erneut fragen. Ohne die Sperre
		// laeuft spawnclient() 60-mal je Sekunde ins Leere, solange der
		// Regler mehr Bots verlangt als das Zimmer hat.
		if (!ok) ts_bot_sperre = time + 5;
		if (cvar("ts_bot_debug"))
			bprint(PRINT_HIGH, ok ? "TSBOT gespawnt\n" : "TSBOT spawnclient lieferte world\n");
	}
	else if (gewuenscht < da)          TS_Bot_Entfernen();
};

#else

// Ohne FTE gibt es keine Bots -- aber StartFrame ruft die Funktion. Ein leerer
// Rumpf ist ehrlicher als eine Bedingung an der Aufrufstelle: dort stuende
// sonst eine Praeprozessor-Klammer um Spiellogik, die mit Bots nichts zu tun hat.
void() TS_Bot_Abgleich = {};

#endif
