string menu_opts_buttons[7] = {"om_video", "om_audio", "om_binds", "om_acces", "om_console", "om_lang", "om_back"};

string(string prev_id) Menu_Options_GetNextButton =
{
    if (prev_id == "")
        return menu_opts_buttons[0];

    string ret = menu_opts_buttons[0];

    for(float i = 0; i < menu_opts_buttons.length; i++) {
        if (menu_opts_buttons[i] == prev_id) {
            if (i + 1 >= menu_opts_buttons.length)
                break;

            ret = menu_opts_buttons[i + 1];
            break;
        }
    }

    return ret;
};

string(string next_id) Menu_Options_GetPreviousButton =
{
    if (next_id == "")
        return menu_opts_buttons[menu_opts_buttons.length - 1];

    string ret = menu_opts_buttons[menu_opts_buttons.length - 1];

    for(float i = menu_opts_buttons.length - 1; i > 0; i--) {
        if (menu_opts_buttons[i] == next_id) {
            if (i - 1 < 0)
                break;

            ret = menu_opts_buttons[i - 1];
            break;
        }
    }

    return ret;
};

void() Menu_Options =
{
    Menu_DrawBackground();
    Menu_DrawTitle(T("CONFIGURATION"));

    Menu_Button(1, "om_video", T("VIDEO"), T("Visual Fidelity options.")) ? current_menu = MENU_VIDEO : 0;
    Menu_Button(2, "om_audio", T("AUDIO"), T("Volume sliders.")) ? current_menu = MENU_AUDIO : 0;
    Menu_Button(3, "om_binds", T("CONTROLS"), T("Control Options and Bindings.")) ? current_menu = MENU_CONTROL : 0;
    Menu_Button(4, "om_acces", T("ACCESSIBILITY"), T("Content, Interface, and Readability options.")) ? current_menu = MENU_ACCESSIBILITY : 0;
    Menu_DrawDivider(5);
    Menu_Button(5.25, "om_console", T("OPEN CONSOLE"), T("Access the Developer Console.")) ? localcmd("toggleconsole\n") : 0;

    string language_label = Localization_IsGerman() ? "SPRACHE: DEUTSCH" : "LANGUAGE: ENGLISH";
    if (Menu_Button(6.25, "om_lang", language_label, T("Switch the game language."))) {
        localcmd(sprintf("seta cl_language %d\n", Localization_IsGerman() ? LANGUAGE_ENGLISH : LANGUAGE_GERMAN));
    }

#ifdef MENU

    Menu_Button(-1, "om_back", T("BACK"), T("Return to Main Menu.")) ? current_menu = MENU_MAIN : 0;

#else

    Menu_Button(-1, "om_back", T("BACK"), T("Return to Pause Menu.")) ? current_menu = MENU_PAUSE : 0;

#endif // MENU

	sui_pop_frame();	
};