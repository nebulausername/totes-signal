string UserMapNameLookup(string bsp_name);

string loading_tips[] =
{
    "Kein Empfang. Nur Untote.",
    "Das Signal ist tot - du noch nicht.",
    "Kopfschuesse geben mehr Punkte. Ziel hoeher.",
    "FEUER halten - oder AUTO fuer Dauerfeuer.",
    "Leeres Magazin, toter Held. Immer nachladen!",
    "Max-Ammo fuellt das Magazin NICHT - vorher nachladen.",
    "Quick Revive bringt dich im Solo zurueck.",
    "Jugger-Nog erhoeht deine Lebensenergie.",
    "Speed Cola laedt schneller nach.",
    "Speed Cola baut Barrikaden schneller auf.",
    "Double Tap steigert die Feuerrate.",
    "Stamin-Up macht dich schneller und ausdauernder.",
    "PhD Flopper schuetzt vor eigenen Explosionen.",
    "Deadshot Daiquiri verbessert deine Zielgenauigkeit.",
    "Mule Kick: trage drei Waffen gleichzeitig.",
    "Pack-a-Punch macht aus Schrott eine Kanone.",
    "Die Mystery Box ist Gluecksache - manchmal die Rettung.",
    "Ein Messer spart Munition bei frischen Zombies.",
    "Sprint schafft Abstand. Ducken rettet den Kopf.",
    "Zielen: rechts wischen. Laufen: linker Stick.",
    "Runde fuer Runde werden sie schneller. Bleib in Bewegung.",
    "Spare Punkte fuer die Tuer, die den Weg oeffnet.",
    "Baue Barrikaden wieder auf - jedes Brett gibt Punkte.",
    "Halte einen Crawler am Leben und suche Geheimnisse.",
    "Zusammen haelt man laenger durch. Deckt euch gegenseitig.",
    "Laeuft offline: einmal geladen, immer spielbar."
};

float loading_tip_endtime;
string current_tip;
string GetLoadingTip() =
{
    if (time > loading_tip_endtime) {
        current_tip = loading_tips[random() * loading_tips.length];
        loading_tip_endtime = time + 5;
    }

    return current_tip;
};

void(vector screensize, float opaque) m_drawloading =
{
    // Black Background
    drawfill([0, 0], screensize, [0, 0, 0], 1);

    string current_map_loading = "";

    if (map_name_override != "")
        current_map_loading = map_name_override;
    else
        current_map_loading = cvar_string("mapname");

    string map_loadscreen_path = sprintf("gfx/lscreen/%s", current_map_loading);

    // If it's blank, just keep the screen black until FTE sends it to us.
    if (current_map_loading == "")
        return;

    // Pick a loading tip (translated at display time).
    string loading_tip = T(GetLoadingTip());

    string map_name_pretty = "";

    // We use the OVERRIDE key if we don't know (direct connect).
    if (map_name_override != "OVERRIDE") {
        // A little slow but whatever.
        // If the loading screen doesn't exist on disk, default to a generic one.
        float file_handle = fopen(sprintf("%s.png", map_loadscreen_path), FILE_READ);

        if (file_handle == -1)
            map_loadscreen_path = "gfx/lscreen/lscreen";
        else
            fclose(file_handle);

        map_name_pretty = UserMapNameLookup(current_map_loading);
    } else {
        map_name_pretty = T("Direct Connect..");
        map_loadscreen_path = "gfx/lscreen/lscreen";
    }

    // Loading screen
    drawpic([0, 0], map_loadscreen_path, screensize, [1, 1, 1], 1);

    // Cinematic Lines
    drawfill([0, 0], [screensize_x, 36], [0, 0, 0], 175/255);
    drawfill([0, screensize_y - 36], [screensize_x, 36], [0, 0, 0], 175/255);

    // Map Title
    Draw_String([10, 5], map_name_pretty, MENU_TEXT_LARGE, [1, 1, 0], 1, 0);

    // Notice for how to end server connecting
    if (loading_into_server == true) {
        string abort_message = T("Press ESC to abort connection and return to Menu..");
        drawfill([0, 111], [screensize_x, 36], [0, 0, 0], 175/255);
        Draw_String([screensize_x/2 - getTextWidth(abort_message, MENU_TEXT_MEDIUM_x)/2, 120], abort_message, MENU_TEXT_MEDIUM, [1, 1, 1], 1, 0);
    }

    // Loading Tip
    Draw_String([screensize_x/2 - getTextWidth(loading_tip, MENU_TEXT_SMALL_x)/2, screensize_y - 25], loading_tip, MENU_TEXT_SMALL, [1, 1, 1], 1, 0);
};
