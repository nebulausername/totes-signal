/*
	shared/localization.qc

	Lightweight localization: T(english) returns the translated string for
	the active language (cvar cl_language: 0 = English, 1 = Deutsch) and
	falls back to the English original for anything untranslated - so
	strings can be routed through T() incrementally.

	Adding a language = add another cvar value + switch below.
	See docs/LOCALIZATION.md.
*/

#define LANGUAGE_ENGLISH 0
#define LANGUAGE_GERMAN  1

float() Localization_IsGerman =
{
	return cvar("cl_language") == LANGUAGE_GERMAN;
};

void() Localization_Init =
{
	// cl_language ist eine native FTE-Cvar (immer registriert) -> die alte
	// !cvar_type()-Pruefung war IMMER falsch, der Deutsch-Default griff nie und
	// das Menue blieb englisch. Deshalb eine EIGENE Sentinel-Cvar: setzt Deutsch
	// beim ersten Start UND migriert Bestandsspieler mit haengendem Englisch
	// einmalig. Der LANGUAGE-Toggle (menu_opts.qc) bleibt danach frei nutzbar.
	if (!cvar_type("ts_lang_set")) {
		localcmd("seta cl_language 1\n");   // Default Deutsch (deutsch-first)
		localcmd("seta ts_lang_set 1\n");
	}
};

string(string english) T =
{
	if (!Localization_IsGerman())
		return english;

	switch(english) {
	// === menu: common ===
	case "BACK": return "ZURUECK";
	case "Return to Main Menu.": return "Zurueck zum Hauptmenue.";
	case "Return to Pause Menu.": return "Zurueck zum Pausenmenue.";
	case "Return to Game.": return "Zurueck ins Spiel.";

	// === main menu ===
	case "MAIN MENU": return "HAUPTMENUE";
	case "SOLO": return "SOLO";
	case "Play Solo.": return "Alleine spielen.";
	case "COOPERATIVE": return "KOOPERATIV";
	case "Play with up to Four Players.": return "Mit bis zu vier Spielern spielen.";
	case "CONFIGURATION": return "EINSTELLUNGEN";
	case "Tweak Game related Options.": return "Spieloptionen anpassen.";
	case "CHARACTER BIOS": return "DIE UEBERLEBENDEN";
	case "View Character Bios.": return "Wer im Funkloch noch lebt.";
	case "CREDITS": return "CREDITS";
	case "A free open-source fan project.": return "Ein freies Open-Source-Fanprojekt.";
	case "QUIT GAME": return "SPIEL BEENDEN";
	case "Return to %s.": return "Zurueck zu %s.";

	// === options menu ===
	case "VIDEO": return "VIDEO";
	case "Visual Fidelity options.": return "Grafikoptionen.";
	case "AUDIO": return "AUDIO";
	case "Volume sliders.": return "Lautstaerkeregler.";
	case "CONTROLS": return "STEUERUNG";
	case "Control Options and Bindings.": return "Steuerung und Tastenbelegung.";
	case "ACCESSIBILITY": return "BARRIEREFREIHEIT";
	case "Content, Interface, and Readability options.": return "Inhalts-, Interface- und Lesbarkeitsoptionen.";
	case "OPEN CONSOLE": return "KONSOLE OEFFNEN";
	case "Access the Developer Console.": return "Entwicklerkonsole oeffnen.";
	case "Switch the game language.": return "Spielsprache wechseln.";

	// === pause menu ===
	case "PAUSED": return "PAUSIERT";
	case "RESUME CARNAGE": return "WEITERMACHEN";
	case "RESTART LEVEL": return "LEVEL NEUSTARTEN";
	case "Tough luck? Give things another go.": return "Pech gehabt? Versuch es noch einmal.";
	case "OPTIONS": return "OPTIONEN";
	case "END GAME": return "SPIEL BEENDEN";
	case "Are you sure you want to restart?": return "Wirklich neu starten?";
	case "Are you sure you want to quit?": return "Wirklich beenden?";
	case "You will lose any progress that you have made.": return "Dein gesamter Fortschritt geht verloren.";
	case "GET ME OUTTA HERE!": return "JA, RAUS HIER!";
	case "I WILL PERSEVERE": return "NEIN, ICH MACHE WEITER";

	// === loading screen ===
	case "Press ESC to abort connection and return to Menu..": return "ESC druecken, um den Verbindungsaufbau abzubrechen..";
	case "Direct Connect..": return "Direktverbindung..";

	// === loading tips (gameplay-relevant; jokes stay English) ===
	case "Quick Revive will resurrect you in Solo.": return "Quick Revive belebt dich im Solo-Modus wieder.";
	case "Use Quick Revive to revive faster in Co-Op!": return "Mit Quick Revive belebst du im Koop schneller wieder!";
	case "Jugger-Nog increases your health.": return "Jugger-Nog erhoeht deine Lebenspunkte.";
	case "Speed Cola increases Reload speed.": return "Speed Cola beschleunigt das Nachladen.";
	case "Speed Cola allows faster Barricade building": return "Mit Speed Cola reparierst du Barrikaden schneller.";
	case "Double Tap will improve Rate of Fire.": return "Double Tap erhoeht die Feuerrate.";
	case "Stamin-Up increases your Move Speed.": return "Stamin-Up erhoeht dein Bewegungstempo.";
	case "Stamin-Up allows you to Sprint longer.": return "Mit Stamin-Up sprintest du laenger.";
	case "PhD Flopper grants explosive immunity.": return "PhD Flopper macht immun gegen Explosionen.";
	case "Dive-to-prone with PhD to cause PAIN!": return "Hechte mit PhD in die Liegeposition - AUTSCH!";
	case "Deadshot Daiquiri improves your accuracy.": return "Deadshot Daiquiri verbessert deine Genauigkeit.";
	case "Deadshot Daiquiri removes sniper scope sway.": return "Deadshot Daiquiri entfernt das Zielfernrohr-Wackeln.";
	case "Deadshot Daiquiri increases weapon accuracy.": return "Deadshot Daiquiri erhoeht die Waffengenauigkeit.";
	case "Carry three weapons with Mule Kick!": return "Trage drei Waffen mit Mule Kick!";
	case "Pack-A-Punch the Kar98k to get to round 500!": return "Verbessere den Kar98k am Pack-a-Punch fuer Runde 500!";
	case "Max Ammo doesn't refill your mag, so RELOAD!": return "Max Ammo fuellt nicht das Magazin - NACHLADEN!";
	case "Dive on top of your friends to win!": return "Hechte auf deine Freunde, um zu gewinnen!";
	case "Hold a crawler and hunt for secrets.": return "Lass einen Crawler leben und suche nach Geheimnissen.";
	case "Use the Zap-O-Matic if you need to revive in a pinch.": return "Nutze den Zap-O-Matic, wenn du schnell wiederbeleben musst.";
	case "Open Source!": return "Open Source!";
	case "Free software!": return "Freie Software!";
	case "Now with less bugs!": return "Jetzt mit weniger Bugs!";
	case "Support the Internet Archive!": return "Unterstuetze das Internet Archive!";

	// === HUD: rounds / game over / spectating ===
	case "Round": return "Runde";
	case "SIGNAL LOST": return "SIGNAL VERLOREN";
	case "You Survived %d Round": return "Du hast %d Runde ueberlebt";
	case "You Survived %d Rounds": return "Du hast %d Runden ueberlebt";
	case "SPECTATING": return "ZUSCHAUERMODUS";
	case "You will spawn next Round": return "Du spawnst in der naechsten Runde";
	case "(Fly around or go grab a snack!)": return "(Flieg herum oder hol dir einen Snack!)";
	case "ACHIEVEMENT GET!": return "ERFOLG FREIGESCHALTET!";
	case " needs to be revived": return " muss wiederbelebt werden";

	// === HUD: use prompts (prefix + suffix around the key name) ===
	case "Hold  ": return "Halte  ";
	case "Hold ": return "Halte ";
	case " to open Door": return " zum Oeffnen der Tuer";
	case " to remove Debris": return " zum Raeumen der Truemmer";
	case " to buy Ammo for ": return " fuer Munition: ";
	case " to buy ": return " zum Kauf von ";
	case " to Rebuild Barrier": return " zum Reparieren der Barrikade";
	case " for Mystery Box": return " fuer die Mystery Box";
	case " for ": return " fuer ";
	case "The Power must be Activated first": return "Der Strom muss zuerst aktiviert werden";
	case " to Turn On the Power": return " zum Einschalten des Stroms";
	case " to Activate the Trap": return " zum Aktivieren der Falle";
	case " to Pack-a-Punch": return " zum Aufwerten (Pack-a-Punch)";
	case " to Revive Player": return " zum Wiederbeleben";
	case " to use Teleporter": return " zum Benutzen des Teleporters";
	case "Teleporter is cooling down": return "Teleporter kuehlt ab";
	case " to initate link to pad": return " zum Verbinden mit dem Pad";
	case "Link not active": return "Verbindung nicht aktiv";
	case " to link pad with core": return " zum Verbinden von Pad und Kern";
	case " to End the Game": return " zum Beenden des Spiels";
	case "It doesn't seem to be working..": return "Es scheint nicht zu funktionieren..";
	case " to Drop the Nuke": return " zum Abwerfen der Nuke";
	case "[Cost: ": return "[Preis: ";

	// === menu: common actions / values ===
	case "APPLY": return "UEBERNEHMEN";
	case "Save & Apply Settings.": return "Einstellungen speichern & anwenden.";
	case "REFRESH": return "AKTUALISIEREN";
	case "CANCEL": return "ABBRECHEN";
	case "ENABLED": return "AN";
	case "DISABLED": return "AUS";
	case "HOLD": return "HALTEN";
	case "TOGGLE": return "UMSCHALTEN";
	case "Welcome, %s": return "Willkommen, %s";

	// === options: configuration submenus ===
	case "CONTROL OPTIONS": return "STEUERUNGSOPTIONEN";
	case "Return to Configuration.": return "Zurueck zu den Einstellungen.";
	case "Return to Configuration Menu.": return "Zurueck zum Einstellungsmenue.";

	// === controls menu ===
	case "AIM DOWN SIGHT": return "KIMME & KORN";
	case "Switch between Hold and Toggle ADS Modes.": return "Zwischen Halten und Umschalten fuers Zielen wechseln.";
	case "SENSITIVITY": return "EMPFINDLICHKEIT";
	case "Alter Look Sensitivity.": return "Blickempfindlichkeit anpassen.";
	case "INVERT LOOK": return "Y-ACHSE INVERTIEREN";
	case "Invert Y-Axis Camera Input.": return "Y-Achse der Kamera invertieren.";
	case "GAMEPAD": return "GAMEPAD";
	case "Gamepad specific options.": return "Gamepad-spezifische Optionen.";
	case "BINDINGS": return "TASTENBELEGUNG";
	case "Change Input Bindings.": return "Tastenbelegung aendern.";

	// === gamepad menu ===
	case "GAMEPAD OPTIONS": return "GAMEPAD-OPTIONEN";
	case "GLYPH TYPE": return "GLYPHEN-STIL";
	case "Change the Style/Branding for Gamepad Glyphs.": return "Stil/Marke der Gamepad-Glyphen aendern.";
	case "RUMBLE": return "VIBRATION";
	case "Toggle Rumble during Gameplay Actions.": return "Vibration bei Spielaktionen umschalten.";
	case "AIM ASSIST": return "ZIELHILFE";
	case "Toggle Aim Sensitivity+Snapping Assist.": return "Zielhilfe (Empfindlichkeit + Einrasten) umschalten.";
	case "X AXIS SENSITIVITY": return "X-ACHSEN-EMPFINDLICHKEIT";
	case "Alter X-Axis Look Sensitivity.": return "Empfindlichkeit der X-Achse anpassen.";
	case "Y AXIS SENSITIVITY": return "Y-ACHSEN-EMPFINDLICHKEIT";
	case "Alter Y-Axis Look Sensitivity.": return "Empfindlichkeit der Y-Achse anpassen.";
	case "Return to Control Options.": return "Zurueck zu den Steuerungsoptionen.";

	// === bindings menu ===
	case "CONTROL BINDINGS": return "TASTENBELEGUNG";
	case "JUMP": return "SPRINGEN";
	case "SPRINT": return "SPRINTEN";
	case "CHANGE STANCE": return "HALTUNG WECHSELN";
	case "SWAP WEAPON": return "WAFFE WECHSELN";
	case "INTERACT": return "INTERAGIEREN";
	case "RELOAD": return "NACHLADEN";
	case "MELEE": return "NAHKAMPF";
	case "PRIMARY GRENADE": return "PRIMAERGRANATE";
	case "SECONDARY GRENADE": return "SEKUNDAERGRANATE";
	case "WEAPON FIRE": return "FEUERN";
	case "AIM DOWN SIGHTS": return "ZIELEN";

	// === audio menu ===
	case "AUDIO OPTIONS": return "AUDIO-OPTIONEN";
	case "MASTER VOLUME": return "GESAMTLAUTSTAERKE";
	case "Volume for all Audio.": return "Lautstaerke fuer alle Audioinhalte.";
	case "INTERFACE VOLUME": return "MENUE-LAUTSTAERKE";
	case "Volume for UI/Menus.": return "Lautstaerke fuer Menues und Interface.";
	case "MUSIC VOLUME": return "MUSIKLAUTSTAERKE";
	case "Volume for Background Music.": return "Lautstaerke der Hintergrundmusik.";

	// === video menu ===
	case "VIDEO OPTIONS": return "VIDEO-OPTIONEN";
	case "RESOLUTION": return "AUFLOESUNG";
	case "Window size adjustment.": return "Fenstergroesse anpassen.";
	case "FULLSCREEN": return "VOLLBILD";
	case "Change Fullscreen Mode.": return "Vollbildmodus aendern.";
	case "BORDERLESS": return "RANDLOS";
	case "SHOW FPS": return "FPS ANZEIGEN";
	case "Toggles display of FPS Values.": return "Anzeige der FPS-Werte umschalten.";
	case "VERBOSE": return "AUSFUEHRLICH";
	case "MAX FPS": return "MAX. FPS";
	case "Configure Maximum FPS Value.": return "Maximalen FPS-Wert festlegen.";
	case "[VSYNC ON] MAX FPS": return "[VSYNC AN] MAX. FPS";
	case "VSYNC": return "VSYNC";
	case "Sync Framerate with Display.": return "Bildrate mit dem Display synchronisieren.";
	case "FIELD OF VIEW": return "SICHTFELD";
	case "Change Camera Field of View.": return "Sichtfeld der Kamera aendern.";
	case "GAMMA": return "GAMMA";
	case "Adjust game Black Level.": return "Schwarzwert des Spiels anpassen.";
	case "ULTRAWIDE MODE": return "ULTRAWIDE-MODUS";
	case "Condenses HUD closer to center of Display.": return "Rueckt das HUD naeher zur Bildmitte.";
	case "PARTICLES": return "PARTIKEL";
	case "Toggle Particle Effects for Performance.": return "Partikeleffekte fuer mehr Leistung umschalten.";
	case "TEXTURE FILTERING": return "TEXTURFILTERUNG";
	case "Choose 3D Environment Filtering Mode.": return "Filtermodus der 3D-Umgebung waehlen.";
	case "NEAREST": return "NEAREST";
	case "LINEAR": return "LINEAR";

	// === accessibility menu ===
	case "HITMARKERS": return "TREFFERMARKER";
	case "HUD Hitmarkers for visual feedback.": return "HUD-Treffermarker fuer visuelles Feedback.";
	case "TEXT BACKDROP": return "TEXT-HINTERGRUND";
	case "Opacity of backdrop for text elements on HUD.": return "Deckkraft des Hintergrunds fuer HUD-Textelemente.";
	case "ACCESSIBLE COLORS": return "KONTRASTFARBEN";
	case "Uses enhanced Player colors to improve visibilty.": return "Nutzt kontrastreichere Spielerfarben fuer bessere Sichtbarkeit.";
	case "WHITE SCREEN FLASHES": return "WEISSE BILDSCHIRMBLITZE";
	case "Choose the color of white screen flashes.": return "Farbe der weissen Bildschirmblitze waehlen.";
	case "WHITE": return "WEISS";
	case "BLACK": return "SCHWARZ";
	case "MONTH SPOOF": return "MONAT VORTAEUSCHEN";
	case "Lie to the game about the current Month, if you are host.": return "Dem Spiel als Host einen anderen Monat vortaeuschen.";
	case "REAL TIME": return "ECHTZEIT";
	case "JANUARY": return "JANUAR";
	case "FEBRUARY": return "FEBRUAR";
	case "MARCH": return "MAERZ";
	case "APRIL": return "APRIL";
	case "MAY": return "MAI";
	case "JUNE": return "JUNI";
	case "JULY": return "JULI";
	case "AUGUST": return "AUGUST";
	case "SEPTEMBER": return "SEPTEMBER";
	case "OCTOBER": return "OKTOBER";
	case "NOVEMBER": return "NOVEMBER";
	case "DECEMBER": return "DEZEMBER";

	// === credits menu ===
	case "MODELING, MAPS": return "MODELLE, MAPS";
	case "PROGRAMMING": return "PROGRAMMIERUNG";
	case "2D ART": return "2D-GRAFIK";
	case "MUSIC": return "MUSIK";
	case "SFX": return "SOUNDEFFEKTE";
	case "SPECIAL THANKS": return "BESONDERER DANK";

	// === coop menu ===
	case "PLAYER NAME": return "SPIELERNAME";
	case "Name that appears in-game and on the Scoreboard.": return "Name, der im Spiel und auf der Rangliste erscheint.";
	case "JOIN GAME": return "SPIEL BEITRETEN";
	case "Join an in-progress Match.": return "Einem laufenden Match beitreten.";
	case "CREATE GAME": return "SPIEL ERSTELLEN";
	case "Create a new Match for others to join.": return "Ein neues Match zum Beitreten erstellen.";
	case "Return to Co-Op Menu.": return "Zurueck zum Koop-Menue.";
	case "BROWSE SERVERS": return "SERVER DURCHSUCHEN";
	case "Browse the list of active Servers.": return "Liste aktiver Server durchsuchen.";
	case "DIRECT IP/ID": return "DIREKT IP/ID";
	case "Connect directly to an active Server.": return "Direkt mit einem aktiven Server verbinden.";
	case "Return to Join Game Menu.": return "Zurueck zum Beitreten-Menue.";
	case "Refresh server list.": return "Serverliste aktualisieren.";
	case "NOTE: Keyboard or gamepad is not supported for server selection.": return "HINWEIS: Tastatur oder Gamepad wird fuer die Serverauswahl nicht unterstuetzt.";
	case "SERVER IP/ROOM ID": return "SERVER-IP/RAUM-ID";
	case "IP or ID for the Server (typically starts with /).": return "IP oder ID des Servers (beginnt meist mit /).";
	case "SERVER PASSWORD": return "SERVER-PASSWORT";
	case "Password for the Match set by the Host (optional).": return "Vom Host gesetztes Match-Passwort (optional).";
	case "CONNECT TO SERVER": return "MIT SERVER VERBINDEN";
	case "Attempt to connect to Game.": return "Verbindung zum Spiel herstellen.";
	case "SERVER NAME": return "SERVERNAME";
	case "Enter a name that will appear in the Server List.": return "Name eingeben, der in der Serverliste erscheint.";
	case "SERVER PORT": return "SERVER-PORT";
	case "Edit the port that the Server will use.": return "Port bearbeiten, den der Server nutzt.";
	case "Enter an (optional) password to limit who can join.": return "Optionales Passwort setzen, um Beitritte zu beschraenken.";
	case "MAX PLAYERS": return "MAX. SPIELER";
	case "Change the maximum number of players who can join your server.": return "Maximale Spielerzahl fuer deinen Server aendern.";
	case "CHOOSE MAP": return "KARTE WAEHLEN";
	case "Select a Map to start the Game.": return "Eine Map zum Starten des Spiels waehlen.";

	// === map selection menu ===
	case "SELECT MAP: SOLO": return "KARTE WAEHLEN: SOLO";
	case "SELECT MAP: COOP": return "KARTE WAEHLEN: KOOP";
	case "USER MAPS: SOLO": return "EIGENE KARTEN: SOLO";
	case "USER MAPS: COOP": return "EIGENE KARTEN: KOOP";
	case "Return to Stock Map selection.": return "Zurueck zur Standard-Map-Auswahl.";
	case "Return to Create Game Menu.": return "Zurueck zum Spiel-Erstellen-Menue.";
	case "USER MAPS": return "EIGENE KARTEN";
	case "View User-Created Maps.": return "Von Nutzern erstellte Maps ansehen.";
	case "RANDOM": return "ZUFALL";
	case "Feeling indecisive? Try rolling the dice.": return "Unentschlossen? Lass den Zufall entscheiden.";
	case "NEXT PAGE": return "NAECHSTE SEITE";
	case "Advance to next User Map page.": return "Zur naechsten Usermap-Seite wechseln.";
	case "PREVIOUS PAGE": return "VORHERIGE SEITE";
	case "Return to last User Map page.": return "Zur vorherigen Usermap-Seite zurueck.";

	// === lobby / pre-game menu ===
	case "PRE-GAME": return "VORBEREITUNG";
	case "START GAME": return "SPIEL STARTEN";
	case "Face the Horde!": return "Stell dich der Horde!";
	case "GAME SETTINGS": return "SPIELEINSTELLUNGEN";
	case "Adjust Gameplay Options.": return "Gameplay-Optionen anpassen.";
	case "NOT SUPPORTED BY MAP": return "VON MAP NICHT UNTERSTUETZT";
	case "Return to Map Selection.": return "Zurueck zur Map-Auswahl.";
	case "..Take it back!": return "..Doch nicht!";
	case "Game Starting In.. %d": return "Spiel startet in.. %d";
	case "Game Mode": return "Spielmodus";
	case "Difficulty": return "Schwierigkeit";
	case "Start Round": return "Startrunde";
	case "Magic": return "Magie";
	case "Headshots Only": return "Nur Kopfschuss";
	case "Horde Size": return "Horden-Groesse";
	case "Fast Rounds": return "Schnelle Runden";

	// === game settings menu ===
	case "GAME MODE": return "SPIELMODUS";
	case "START ROUND": return "STARTRUNDE";
	case "Round to begin the Game on.": return "Runde, in der das Spiel beginnt.";
	case "MAGIC": return "MAGIE";
	case "Whether to allow Perks, Power-Ups, and the Mystery Box.": return "Ob Perks, Power-Ups und die Mystery Box erlaubt sind.";
	case "HEADSHOTS ONLY": return "NUR KOPFSCHUESSE";
	case "Headshots are the only means of Death. Explosives don't work, either.": return "Nur Kopfschuesse toeten. Auch Sprengstoff wirkt nicht.";
	case "HORDE SIZE": return "HORDEN-GROESSE";
	case "Maximum Zombies that can Active at once.": return "Maximale Zahl gleichzeitig aktiver Zombies.";
	case "FAST ROUNDS": return "SCHNELLE RUNDEN";
	case "Minimize Time between Rounds.": return "Zeit zwischen Runden minimieren.";
	case "Return to Pre-Game Menu.": return "Zurueck zum Vorbereitungsmenue.";
	case "DIFFICULTY": return "SCHWIERIGKEIT";

	// === game modes ===
	case "CLASSIC": return "KLASSISCH";
	case "Classic Round-Based Zombies.": return "Klassisches rundenbasiertes Zombies.";
	case "GRIEF": return "GRIEF";
	case "GUN GAME": return "GUN GAME";
	case "Race to earn Score to cycle through Weaponry.": return "Sammle Punkte, um durch alle Waffen zu wechseln.";
	case "Cycle all Weapons to WIN!": return "Wechsle durch alle Waffen zum SIEG!";
	case "HARDCORE": return "HARDCORE";
	case "No HUD? Two Perks? 150% Item Cost? No Problem.": return "Kein HUD? Zwei Perks? 150% Kosten? Kein Problem.";
	case "WILD WEST": return "WILDER WESTEN";
	case "Ole Fashioned stand-off between you and the Dead.": return "Ein altmodisches Duell zwischen dir und den Toten.";
	case "It's a stand-off!": return "Ein Duell!";
	case "STICKS & STONES": return "STOECKE & STEINE";
	case "Knives-and-Nades only. Grenades Explode on Contact.": return "Nur Messer und Granaten. Granaten explodieren bei Kontakt.";
	case "Ballistic Knife FTW!": return "Ballistisches Messer FTW!";
	case "FEVER": return "FIEBER";
	case "The cycle continues. Old meets new in this Cold War inspired mode!": return "Der Kreislauf geht weiter. Alt trifft Neu in diesem vom Kalten Krieg inspirierten Modus!";

	// === difficulties ===
	case "NORMAL": return "NORMAL";
	case "Normal Zombies gameplay.": return "Normales Zombies-Gameplay.";
	case "EASY": return "LEICHT";
	case "Less & Slower Zombies. More Power-Ups. More Health.": return "Weniger & langsamere Zombies. Mehr Power-Ups. Mehr Leben.";
	case "HARD": return "SCHWER";
	case "More & Faster Zombies. Less Power-Ups. Less Health.": return "Mehr & schnellere Zombies. Weniger Power-Ups. Weniger Leben.";
	case "NIGHTMARE": return "ALPTRAUM";
	case "Hellish Zombies. Earn Less Score. Rare Power-Ups. 1 hit KO.": return "Hoellische Zombies. Weniger Punkte. Seltene Power-Ups. 1-Treffer-K.O.";

	// === server browser table headers ===
	case "Server Name": return "Servername";
	case "Map": return "Map";
	case "Players": return "Spieler";

	// === HUD: scoreboard headers ===
	case "Score": return "Punkte";
	case "Kills": return "Kills";
	case "Downs": return "K.O.";
	case "Revives": return "Wiederbelebt";
	case "Headshots": return "Kopfschuesse";

	// >>> ERFOLGE-ANFANG (erzeugt) <<<
	// === Erfolge (erzeugt aus server/data/erfolge.json) ===
	// Nicht von Hand aendern -- neu erzeugen mit
	//   node server/scripts/erfolge-qc-erzeugen.mjs
	// ASCII 33..126, weil die Spielschrift nichts anderes kann.
	case "Ready..": return "Bereit ...";
	case "Reach Round 5": return "Erreiche Runde 5";
	case "Steady..": return "Ruhig ...";
	case "Reach Round 10": return "Erreiche Runde 10";
	case "Go? Hell No...": return "Los? Auf keinen Fall.";
	case "Reach Round 15": return "Erreiche Runde 15";
	case "Where Did Legs Go?": return "Wo sind die Beine hin?";
	case "Turn a Zombie into a Crawler": return "Mach aus einem Zombie einen Krabbler";
	case "The F Bomb": return "Mit Kanonen auf Spatzen";
	case "Use the Nuke Power-Up to kill a     single Zombie": return "Toete mit der Atombombe genau einen Zombie";
	case "No Perks? No Problem": return "Ohne Perks? Kein Problem.";
	case "Survive an entire Round without     Perks past Round 15 or higher": return "Ueberstehe ab Runde 15 eine ganze Runde ohne Perks";
	case "Dipsomaniac": return "Trunksucht";
	case "Hold all Perk-A-Colas at once in a  single Game": return "Halte alle Perk-A-Colas gleichzeitig";
	case "Oops!": return "Hoppla!";
	case "Nearly die from fall damage": return "Ueberlebe einen Sturz nur knapp";
	case "Abstinence Program": return "Unberuehrt";
	case "Survive to Round 10 without taking  any enemy damage": return "Erreiche Runde 10, ohne Schaden zu nehmen";
	case "Pro-Gamer Move": return "Meisterleistung";
	case "Die on Round 1 with no Ammo         remaining": return "Stirb in Runde 1 mit leerem Magazin";
	case "Spinning Plates": return "Alle Teller in der Luft";
	case "Keep entry points Barricaded all the way to Round 10": return "Halte bis Runde 10 alle Fenster vernagelt";
	case "Unlucky": return "Pech gehabt";
	case "Have the Mystery Box move 10 times": return "Lass die Wundertruhe zehnmal umziehen";
	case "The Collector": return "Der Sammler";
	case "Buy every weapon off the wall in a  single Game": return "Kaufe in einem Spiel jede Wandwaffe";
	case "Barrels o' Fun": return "Fass ohne Boden";
	case "In Nacht der Untoten, kill 15       Zombies with Explosive Barrels": return "Toete in Nacht der Untoten 15 Zombies mit Explosivfaessern";
	case "It's a Trap!": return "Eine Falle!";
	case "In Kino der Toten, kill 5 Crawlers  with the use of 1 Trap": return "Nicht verfuegbar: verlangt Kino der Toten";
	case "Up-Link": return "Standleitung";
	case "In Kino der Toten, teleport to the  Pack-A-Punch 5 times in a single  Game": return "Nicht verfuegbar: verlangt Kino der Toten";
	case "Undone": return "Zermuerbt";
	case "Survive a total of 150 Rounds on    Nacht der Untoten": return "Ueberstehe in Nacht der Untoten insgesamt 150 Runden";
	case "Moviegoer": return "Kinogaenger";
	case "Play 10 total Matches on Kino der   Toten": return "Nicht verfuegbar: verlangt Kino der Toten";
	case "C'mere, Cupcake!": return "Komm her, Suesser!";
	case "Kill yourself with your own Grenade": return "Sprenge dich mit deiner eigenen Granate";
	case "Orbital Strike": return "Schlag von oben";
	case "Kill 5 Zombies at once, with the    Panzerschreck, while in the air": return "Toete im Sprung fuenf Zombies mit dem Panzerschreck";
	case "A House Divided, Multiplied, then Subtracted": return "Geteiltes Haus";
	case "In Nacht der Untoten, reach Round 10 without going upstairs & without fixing Barriers, then go upstairs & allow those Barriers to be Destroyed": return "Nicht verfuegbar: Erkennung fehlt";
	case "Colt-Hearted Killer": return "Kaltbluetig";
	case "Reach Round 10 using only the Colt  M1911": return "Erreiche Runde 10 nur mit der Colt M1911";
	case "Cannot Cache and Carry": return "Voll ist voll";
	case "Collected a Max Ammo power-up whilst already being at fully ammo      capacity": return "Nimm Max-Munition bei vollem Vorrat";
	case "Divide and Conquer": return "Teile und herrsche";
	case "Turn all Zombies into Crawlers in a single Round": return "Mach in einer Runde alle Zombies zu Krabblern";
	case "Tough Luck!": return "Dumm gelaufen";
	case "Die before reaching Round 5": return "Stirb vor Runde 5";
	case "All Are One with Gregg!": return "Alle sind eins mit Gregg!";
	case "Slasher": return "Schlitzer";
	case "Perform 100 total Melee kills": return "Erledige insgesamt 100 Zombies im Nahkampf";
	case "Made by Children": return "Von Kindern gebaut";
	case "Get a Zombie stuck for 5 minutes": return "Lass einen Zombie fuenf Minuten feststecken";
	case "Increase your Firepower!": return "Mehr Feuerkraft!";
	case "Use the Pack-A-Punch for the first  time": return "Benutze zum ersten Mal Pack-a-Punch";
	case "Kraut Got Your Tongue?": return "Kopfsache";
	case "Get 25 Headshots": return "Lande 25 Kopfschuesse";
	case "Mindblowing": return "Umwerfend";
	case "Get 250 Headshots": return "Lande 250 Kopfschuesse";
	case "Big Thanks to Explosions": return "Danke, Sprengstoff";
	case "Kill 10 Zombies with a single       Grenade": return "Toete zehn Zombies mit einer einzigen Granate";
	case "Mystery Box Manaic": return "Truhen-Besessen";
	case "Use the Mystery Box 20 times in a   single Game": return "Benutze die Wundertruhe 20-mal in einem Spiel";
	case "Instant Help": return "Sofortige Hilfe";
	case "Get 100 total Kills with the        Insta-Kill Power-Up": return "Erledige 100 Zombies unter Insta-Kill";
	case "Blow the Bank": return "Bank gesprengt";
	case "Earn 1,000,000 Points": return "Verdiene insgesamt 1.000.000 Punkte";
	case "..Why Are We Waiting?": return "Worauf warten wir?";
	case "Stand Still for 2 minutes": return "Steh zwei Minuten still";
	case "One Clip": return "Ein Magazin";
	case "Survive a Round using the MG42 and  without Reloading": return "Ueberstehe eine Runde mit dem MG42, ohne nachzuladen";
	case "Twenty-Twenty-One": return "Zwanzig aus zwanzig";
	case "Land 20 Headshots, with 20 Bullets, with one Clip": return "Lande 20 Kopfschuesse mit 20 Schuss aus einem Magazin";
	case "Getting Warmed Up": return "Warmgelaufen";
	case "Earn 10 Achievements": return "Sammle 10 Erfolge";
	case "About Half-Way": return "Gut die Haelfte";
	case "Earn 20 Achievements": return "Sammle 20 Erfolge";
	case "I mean.. 75% is Passing": return "75 Prozent reichen auch";
	case "Earn 30 Achievements": return "Sammle 30 Erfolge";
	case "Over-Achiever": return "Uebererfuellt";
	case "Earn all 42 Achievements": return "Sammle alle 42 Erfolge";
	// <<< ERFOLGE-ENDE (erzeugt) >>>

	default: return english;
	}
};
