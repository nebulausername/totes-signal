float UserMapSupportsCustomGameLookup(string bsp_name);

string menu_loby_buttons[3] = {"lo_start", "lo_games", "lo_back"};

float menu_loby_countdown;
float menu_loby_last;

string(string prev_id) Menu_Lobby_GetNextButton =
{
    if (menu_loby_countdown != 0)
        return "lo_cancl";

    if (prev_id == "")
        return menu_loby_buttons[0];

    string ret = menu_loby_buttons[0];

    for(float i = 0; i < menu_loby_buttons.length; i++) {
        if (menu_loby_buttons[i] == prev_id) {
            if (i + 1 >= menu_loby_buttons.length)
                break;

            ret = menu_loby_buttons[i + 1];
            break;
        }
    }

    if (ret == "lo_games" && !UserMapSupportsCustomGameLookup(current_selected_bsp))
        return "lo_back";

    return ret;
};

string(string next_id) Menu_Lobby_GetPreviousButton =
{
    if (menu_loby_countdown != 0)
        return "lo_cancl";

    if (next_id == "")
        return menu_loby_buttons[menu_loby_buttons.length - 1];

    string ret = menu_loby_buttons[menu_loby_buttons.length - 1];

    for(float i = menu_loby_buttons.length - 1; i > 0; i--) {
        if (menu_loby_buttons[i] == next_id) {
            if (i - 1 < 0)
                break;

            ret = menu_loby_buttons[i - 1];
            break;
        }
    }

    if (ret == "lo_games" && !UserMapSupportsCustomGameLookup(current_selected_bsp))
        return "lo_start";

    return ret;
};

void() Menu_Lobby_StartCountdown =
{
    Menu_PlaySound(MENU_SND_ENTER);
    menu_loby_countdown = time + 6;
    menu_loby_last = 0;
}

void() Menu_Lobby_StopCountdown =
{
    Menu_PlaySound(MENU_SND_ENTER);
    menu_loby_countdown = 0;
    menu_loby_last = 0;
}

void() Menu_Lobby =
{
    Menu_DrawBackground();
    Menu_DrawTitle(T("PRE-GAME"));

    float support_gamesettings = UserMapSupportsCustomGameLookup(current_selected_bsp);

    if (menu_loby_countdown == 0) {
        Menu_Button(1, "lo_start", T("START GAME"), T("Face the Horde!")) ? Menu_Lobby_StartCountdown() : 0;

        if (support_gamesettings)
            Menu_Button(2, "lo_games", T("GAME SETTINGS"), T("Adjust Gameplay Options.")) ? current_menu = MENU_GAMESETTINGS : 0;
        else
            Menu_GreyButton(2, T("NOT SUPPORTED BY MAP"));

        Menu_Button(3, "lo_back", T("BACK"), T("Return to Map Selection.")) ? current_menu = last_map_menu : 0;   // Order 3: erreichbar, weg von der Gesten-Zone
    } else {
        Menu_Button(1, "lo_cancl", T("CANCEL"), T("..Take it back!")) ? Menu_Lobby_StopCountdown() : 0;

        if (support_gamesettings)
            Menu_GreyButton(2, T("GAME SETTINGS"));
        else
            Menu_GreyButton(2, T("NOT SUPPORTED BY MAP"));

        Menu_GreyButton(3, T("BACK"));
    }

    Menu_DrawMapPanel();
    Menu_DrawMapPreview();

    sui_set_align([SUI_ALIGN_CENTER, SUI_ALIGN_CENTER]);

    string gamemode = "";
    string difficulty = "";
    string start_round = "";
    string magic = "";
    string headshots = "";
    string fast_rounds = "";

    switch(cvar("sv_gamemode")) {
        case 0: gamemode = T("CLASSIC"); break;
        case 1: gamemode = T("GRIEF"); break;
        case 2: gamemode = T("GUN GAME"); break;
        case 3: gamemode = T("HARDCORE"); break;
        case 4: gamemode = T("WILD WEST"); break;
        case 5: gamemode = T("STICKS & STONES"); break;
        case 6: gamemode = T("FEVER"); break;
        default: gamemode = "???"; break;
    }

    switch(cvar("sv_difficulty")) {
        case 0: difficulty = T("NORMAL"); break;
        case 1: difficulty = T("EASY"); break;
        case 2: difficulty = T("HARD"); break;
        case 3: difficulty = T("NIGHTMARE"); break;
        default: difficulty = "???"; break;
    }

    start_round = ftos(cvar("sv_startround"));
    if (start_round == "0") start_round = "1";

    if (cvar("sv_magic") == 1) magic = T("ENABLED");
    else magic = T("DISABLED");

    if (cvar("sv_headshotonly") == 1) headshots = T("ENABLED");
    else headshots = T("DISABLED");

    if (cvar("sv_fastrounds") == 1) fast_rounds = T("ENABLED");
    else fast_rounds = T("DISABLED");

    sui_text([65, -160], MENU_TEXT_MEDIUM, T("Game Mode"), [1, 1, 1], 1, 0);
    sui_text([65, -145], MENU_TEXT_SMALL, gamemode, [1, 1, 0], 1, 0);
    sui_fill([65, -135], [90, 2], [0.2, 0.2, 0.2], 1, 0);

    sui_text([235, -160], MENU_TEXT_MEDIUM, T("Difficulty"), [1, 1, 1], 1, 0);
    sui_text([235, -145], MENU_TEXT_SMALL, difficulty, [1, 1, 0], 1, 0);
    sui_fill([235, -135], [90, 2], [0.2, 0.2, 0.2], 1, 0);

    sui_text([65, -120], MENU_TEXT_MEDIUM, T("Start Round"), [1, 1, 1], 1, 0);
    sui_text([65, -105], MENU_TEXT_SMALL, start_round, [1, 1, 0], 1, 0);
    sui_fill([65, -95], [90, 2], [0.2, 0.2, 0.2], 1, 0);

    sui_text([235, -120], MENU_TEXT_MEDIUM, T("Magic"), [1, 1, 1], 1, 0);
    sui_text([235, -105], MENU_TEXT_SMALL, magic, [1, 1, 0], 1, 0);
    sui_fill([235, -95], [90, 2], [0.2, 0.2, 0.2], 1, 0);

    sui_text([65, -80], MENU_TEXT_MEDIUM, T("Headshots Only"), [1, 1, 1], 1, 0);
    sui_text([65, -65], MENU_TEXT_SMALL, headshots, [1, 1, 0], 1, 0);
    sui_fill([65, -55], [90, 2], [0.2, 0.2, 0.2], 1, 0);

    sui_text([235, -80], MENU_TEXT_MEDIUM, T("Horde Size"), [1, 1, 1], 1, 0);
    sui_text([235, -65], MENU_TEXT_SMALL, sprintf("%d", cvar("sv_maxai")), [1, 1, 0], 1, 0);
    sui_fill([235, -55], [90, 2], [0.2, 0.2, 0.2], 1, 0);

    sui_text([65, -40], MENU_TEXT_MEDIUM, T("Fast Rounds"), [1, 1, 1], 1, 0);
    sui_text([65, -25], MENU_TEXT_SMALL, fast_rounds, [1, 1, 0], 1, 0);
    sui_fill([65, -15], [90, 2], [0.2, 0.2, 0.2], 1, 0);

    float lobby_delta = menu_loby_countdown - time;
    if (lobby_delta > 0) {
        sui_text([150, 5], MENU_TEXT_SMALL, sprintf(T("Game Starting In.. %d"), lobby_delta), [1, 1, 1], 1, 0);
	    sui_fill([150, 20], [75 * (lobby_delta/6), 6], [0.2, 0.2 * (lobby_delta/6), 0.2 * (lobby_delta/6)], 1, 0);

        if (menu_loby_last != floor(lobby_delta)) {
            Menu_PlaySound(MENU_SND_BEEP);
            menu_loby_last = floor(lobby_delta);
        }
    } else if (lobby_delta < 0 && menu_loby_countdown != 0) {
        localcmd(sprintf("map %s\n", current_selected_bsp)); 
        Menu_Lobby_StopCountdown();
        current_menu = MENU_MAIN;
    }

	sui_pop_frame();	
};