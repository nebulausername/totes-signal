/*
	client/achievements.qc

	main achievement code

	Copyright (C) 2021-2024 NZ:P Team

	This program is free software; you can redistribute it and/or
	modify it under the terms of the GNU General Public License
	as published by the Free Software Foundation; either version 2
	of the License, or (at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

	See the GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program; if not, write to:

		Free Software Foundation, Inc.
		59 Temple Place - Suite 330
		Boston, MA  02111-1307, USA

*/

/*

Thanks to everyone who submitted Achievement ideas in 2019!

- Derped_Crusader
- TheSmashers
- Chyll
- mrFlamist
- mario135790
- Mission
- RedneckHax0r
- Revnova
- EpicFoxx64
- Detwyler_
- DisrespectfulOtter
- xnick2222x
- greg
- Omar Alejandro
- Cosmicrush
- blubs
- Bernerd

*/

void(float id, string graphic, string name, string description) Achievement_Create =
{
    if (id >= MAX_ACHIEVEMENTS)
        return;
    
    achievements[id].img = strcat("gfx/achievement/", graphic, ".tga");
    achievements[id].name = name;
    achievements[id].description = description;
}

void() Achievement_Save =
{
    float file, i;

    // re-write the achievement file
    file = fopen("ach.dat", FILE_WRITE);
    for (i = 0; i < MAX_ACHIEVEMENTS; i++) {
        fputs(file, strcat(ftos(achievements[i].unlocked), "\n"));
        fputs(file, strcat(ftos(achievements[i].progress), "\n"));
    }

    fclose(file);
}

void() Achievement_Load =
{
    float file, i;
    string val;

    file = fopen("ach.dat", FILE_READ);

    if (file == -1) {
        fclose(file);
        file = fopen("ach.dat", FILE_WRITE);

        for (i = 0; i < MAX_ACHIEVEMENTS * 2; i++) {
            fputs(file, "0\n");
        }

        fclose(file);
        file = fopen("ach.dat", FILE_READ);
    }

    for (i = 0; i < MAX_ACHIEVEMENTS; i++) {
        val = fgets(file);
        achievements[i].unlocked = stof(val);
        val = fgets(file);
        achievements[i].progress = stof(val);
    }

    fclose(file);
}

void() Achievement_Init = 
{
    // Namen und Beschreibungen laufen durch T(). Die deutschen Faelle stehen
    // in shared/localization.qc zwischen den ERFOLGE-Markierungen und werden
    // aus server/data/erfolge.json erzeugt -- dieselbe Quelle, aus der auch
    // die Web-Oberflaeche ihre Texte bekommt. Dort mit echten Umlauten, hier
    // transliteriert, weil die Spielschrift nur ASCII 33..126 kann.

    Achievement_Create(0, "ready", T("Ready.."), T("Reach Round 5"));
    Achievement_Create(1, "steady", T("Steady.."), T("Reach Round 10"));
    Achievement_Create(2, "go_hell_no", T("Go? Hell No..."), T("Reach Round 15"));
    Achievement_Create(3, "where_legs_go", T("Where Did Legs Go?"), T("Turn a Zombie into a Crawler"));
    Achievement_Create(4, "the_f_bomb", T("The F Bomb"), T("Use the Nuke Power-Up to kill a     single Zombie"));
    Achievement_Create(5, "no_perks_no_problem", T("No Perks? No Problem"), T("Survive an entire Round without     Perks past Round 15 or higher"));
    Achievement_Create(6, "dipsomaniac", T("Dipsomaniac"), T("Hold all Perk-A-Colas at once in a  single Game"));
    Achievement_Create(7, "oops", T("Oops!"), T("Nearly die from fall damage"));
    Achievement_Create(8, "abstinence_program", T("Abstinence Program"), T("Survive to Round 10 without taking  any enemy damage"));
    Achievement_Create(9, "pro_gamer_move", T("Pro-Gamer Move"), T("Die on Round 1 with no Ammo         remaining"));
    Achievement_Create(10, "spinning_plates", T("Spinning Plates"), T("Keep entry points Barricaded all the way to Round 10"));
    Achievement_Create(11, "unlucky", T("Unlucky"), T("Have the Mystery Box move 10 times"));
    Achievement_Create(12, "the_collector", T("The Collector"), T("Buy every weapon off the wall in a  single Game"));
    Achievement_Create(13, "barrels_o_fun", T("Barrels o' Fun"), T("In Nacht der Untoten, kill 15       Zombies with Explosive Barrels"));
    Achievement_Create(14, "its_a_trap", T("It's a Trap!"), T("In Kino der Toten, kill 5 Crawlers  with the use of 1 Trap"));
    Achievement_Create(15, "uplink", T("Up-Link"), T("In Kino der Toten, teleport to the  Pack-A-Punch 5 times in a single  Game"));
    Achievement_Create(16, "undone", T("Undone"), T("Survive a total of 150 Rounds on    Nacht der Untoten"));
    Achievement_Create(17, "moviegoer", T("Moviegoer"), T("Play 10 total Matches on Kino der   Toten"));
    Achievement_Create(18, "cmere_cupcake", T("C'mere, Cupcake!"), T("Kill yourself with your own Grenade"));
    Achievement_Create(19, "orbital_strike", T("Orbital Strike"), T("Kill 5 Zombies at once, with the    Panzerschreck, while in the air"));
    Achievement_Create(20, "long_name", T("A House Divided, Multiplied, then Subtracted"), T("In Nacht der Untoten, reach Round 10 without going upstairs & without fixing Barriers, then go upstairs & allow those Barriers to be Destroyed"));
    Achievement_Create(21, "colt_hearted_killer", T("Colt-Hearted Killer"), T("Reach Round 10 using only the Colt  M1911"));
    Achievement_Create(22, "cache_and_carry", T("Cannot Cache and Carry"), T("Collected a Max Ammo power-up whilst already being at fully ammo      capacity"));
    Achievement_Create(23, "divide_and_conquer", T("Divide and Conquer"), T("Turn all Zombies into Crawlers in a single Round"));
    Achievement_Create(24, "tough_luck", T("Tough Luck!"), T("Die before reaching Round 5"));
    Achievement_Create(25, "gregg", T("All Are One with Gregg!"), T("???"));
    Achievement_Create(26, "slasher", T("Slasher"), T("Perform 100 total Melee kills"));
    Achievement_Create(27, "made_by_children", T("Made by Children"), T("Get a Zombie stuck for 5 minutes"));
    Achievement_Create(28, "increase_firepower", T("Increase your Firepower!"), T("Use the Pack-A-Punch for the first  time"));
    Achievement_Create(29, "kraut_tongue", T("Kraut Got Your Tongue?"), T("Get 25 Headshots"));
    Achievement_Create(30, "mindblowing", T("Mindblowing"), T("Get 250 Headshots"));
    Achievement_Create(31, "thanks_explosions", T("Big Thanks to Explosions"), T("Kill 10 Zombies with a single       Grenade"));
    Achievement_Create(32, "mbox_maniac", T("Mystery Box Manaic"), T("Use the Mystery Box 20 times in a   single Game"));
    Achievement_Create(33, "instant_help", T("Instant Help"), T("Get 100 total Kills with the        Insta-Kill Power-Up"));
    Achievement_Create(34, "blow_the_bank", T("Blow the Bank"), T("Earn 1,000,000 Points"));
    Achievement_Create(35, "why_wait", T("..Why Are We Waiting?"), T("Stand Still for 2 minutes"));
    Achievement_Create(36, "one_clip", T("One Clip"), T("Survive a Round using the MG42 and  without Reloading"));
    Achievement_Create(37, "2021", T("Twenty-Twenty-One"), T("Land 20 Headshots, with 20 Bullets, with one Clip"));
    Achievement_Create(38, "warmed_up", T("Getting Warmed Up"), T("Earn 10 Achievements"));
    Achievement_Create(39, "half_way", T("About Half-Way"), T("Earn 20 Achievements"));
    Achievement_Create(40, "75_percent", T("I mean.. 75% is Passing"), T("Earn 30 Achievements"));
    Achievement_Create(41, "over_achiever", T("Over-Achiever"), T("Earn all 42 Achievements"));

    Achievement_Load();

    achievement_pages = ceil(MAX_ACHIEVEMENTS/3);
    current_achievement_page = 1;

    active_achievement = -1;
}

void(float id) Achievement_Unlock = 
{
    local float file, i;

    achievements[id].unlocked = 1;

    // tell the HUD to start drawing
    active_achievement = id;

    // An die Web-Shell melden. Achievement_Save() schreibt nach ach.dat, was
    // im Emscripten-Dateisystem unzuverlaessig ist -- genau der Grund, aus dem
    // Erfolge im Web ueberhaupt abgeschaltet waren. Der Server ist ab jetzt
    // die Wahrheit; die Datei bleibt als Zusatz fuer native Builds.
    print(sprintf("\nTSUI:ach:%d|%d\n", id, achievements[id].progress));

    Achievement_Save();
}

// Setzt einen Erfolg OHNE Toast und ohne Rueckmeldung -- fuer das
// Wiederherstellen des Serverstands beim Spielstart. Ohne das wuerde jeder
// laengst verdiente Erfolg beim naechsten Besuch erneut aufpoppen.
void(float id, float unlocked, float progress) Achievement_Restore =
{
    if (id < 0 || id >= MAX_ACHIEVEMENTS)
        return;

    achievements[id].unlocked = unlocked;
    achievements[id].progress = progress;
}

void(float id, float pg) Achievement_UpdateProgress =
{
    achievements[id].progress = pg;

    print(sprintf("\nTSUI:ach:%d|%d\n", id, pg));

    Achievement_Save();
}