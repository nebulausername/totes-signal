void() ToggleMenu;
float player_count;

string menu_paus_buttons[4];
int menu_paus_submenu;

string(string prev_id) Menu_Pause_GetNextButton =
{
    if (prev_id == "")
        return menu_paus_buttons[0];

    string ret = menu_paus_buttons[0];

    for(float i = 0; i < menu_paus_buttons.length; i++) {
        if (menu_paus_buttons[i] == prev_id) {
            if (i + 1 >= menu_paus_buttons.length)
                break;

            ret = menu_paus_buttons[i + 1];
            break;
        }
    }

    if (player_count != 1 && ret == "pm_reloa")
        ret = "pm_opts";

    if (ret == "")
        ret = "pm_yes";

    return ret;
};

string(string next_id) Menu_Pause_GetPreviousButton =
{
    if (next_id == "")
        return menu_paus_buttons[menu_paus_buttons.length - 1];

    string ret = menu_paus_buttons[menu_paus_buttons.length - 1];

    for(float i = menu_paus_buttons.length - 1; i > 0; i--) {
        if (menu_paus_buttons[i] == next_id) {
            if (i - 1 < 0)
                break;

            ret = menu_paus_buttons[i - 1];
            break;
        }
    }

    if (player_count != 1 && ret == "pm_reloa")
        ret = "pm_resum";

    if (ret == "")
        ret = "pm_no";

    return ret;
};

void(int idx) Menu_Pause_EnterSubMenu =
{
    Menu_PlaySound(MENU_SND_ENTER);
    menu_paus_submenu = idx;
};

void() Menu_Pause_Yes =
{
    if (menu_paus_submenu == 1)
        localcmd("restart\n");
    else if (menu_paus_submenu == 2)
        localcmd("disconnect\n");

    Menu_Pause_EnterSubMenu(0);
};

void() Menu_Pause_No =
{
    Menu_Pause_EnterSubMenu(0);
};

void() Menu_Pause =
{
    Menu_DrawBackground();
    Menu_DrawTitle(T("PAUSED"));

    if (menu_paus_submenu == 0)
    {
        Menu_Button(1, "pm_resum", T("RESUME CARNAGE"), T("Return to Game.")) ? ToggleMenu() : 0;

        if (player_count == 1)
            Menu_Button(2, "pm_reloa", T("RESTART LEVEL"), T("Tough luck? Give things another go.")) ? Menu_Pause_EnterSubMenu(1) : 0;
        else
            Menu_GreyButton(2, T("RESTART LEVEL"));

        Menu_Button(3, "pm_opts", T("OPTIONS"), T("Tweak Game related Options.")) ? current_menu = MENU_OPTIONS : 0;
        Menu_Button(4, "pm_quit", T("END GAME"), T("Return to Main Menu.")) ? Menu_Pause_EnterSubMenu(2) : 0;

        menu_paus_buttons[0] = "pm_resum";
        menu_paus_buttons[1] = "pm_reloa";
        menu_paus_buttons[2] = "pm_opts";
        menu_paus_buttons[3] = "pm_quit";
    }
    else
    {
        Menu_GreyButton(1, T("RESUME CARNAGE"));
        Menu_GreyButton(2, T("RESTART LEVEL"));
        Menu_GreyButton(3, T("OPTIONS"));
        Menu_GreyButton(4, T("END GAME"));

        // Draw the UI
        if (menu_paus_submenu == 1)
            Menu_DrawYesNoPanel(T("Are you sure you want to restart?"), T("You will lose any progress that you have made."));
        else if (menu_paus_submenu == 2)
            Menu_DrawYesNoPanel(T("Are you sure you want to quit?"), T("You will lose any progress that you have made."));

        // Zeilen 8 und 9 lagen bei 60er-Zeilen weit unterhalb des Bildes.
        // Auf Touch direkt unter das Panel, sonst unveraendert.
        float ja   = MENU_TOUCH ? 4 : 8;
        float nein = MENU_TOUCH ? 5 : 9;
        Menu_Button(ja,   "pm_yes", T("GET ME OUTTA HERE!"), "") ? Menu_Pause_Yes() : 0;
        Menu_Button(nein, "pm_no",  T("I WILL PERSEVERE"), "") ? Menu_Pause_No() : 0;

        menu_paus_buttons[0] = "pm_yes";
        menu_paus_buttons[1] = "pm_no";
        menu_paus_buttons[2] = "";
        menu_paus_buttons[3] = "";
    }

	sui_pop_frame();	
};
