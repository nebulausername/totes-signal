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
	// Register once with the archive flag; config.cfg then persists the
	// user's choice, and we never override it on later boots.
	if (!cvar_type("cl_language"))
		localcmd("seta cl_language 0\n");
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
	case "CHARACTER BIOS": return "CHARAKTER-BIOS";
	case "View Character Bios.": return "Charakter-Biografien ansehen.";
	case "CREDITS": return "CREDITS";
	case "Based on NZ:P by the NZ:P Team.": return "Basiert auf NZ:P vom NZ:P-Team.";
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
	case "Based on NZ:P - a game on too many platforms to count.": return "Basiert auf NZ:P - einem Spiel auf unzaehlbar vielen Plattformen.";
	case "Our upstream, NZ:P, has been in development since 2009.": return "Unser Upstream NZ:P wird seit 2009 entwickelt.";
	case "Support the Internet Archive!": return "Unterstuetze das Internet Archive!";

	// === HUD: rounds / game over / spectating ===
	case "Round": return "Runde";
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

	default: return english;
	}
};
