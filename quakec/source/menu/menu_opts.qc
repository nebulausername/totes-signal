string menu_opts_buttons[7] = {"om_video", "om_audio", "om_binds", "om_acces", "om_console", "om_lang", "om_back"};
// Auf Touch zeigt der Bildschirm eine andere Liste (siehe Menu_Options) --
// der Pfeil-/Gamepad-Ring muss dieselbe Reihenfolge kennen, sonst waehlt er
// Eintraege an, die gar nicht gezeichnet werden.
string menu_opts_buttons_touch[6] = {"om_touch", "om_video", "om_audio", "om_acces", "om_lang", "om_back"};

// Zugriff auf die jeweils gezeichnete Liste. QuakeC kennt keine Array-Referenz,
// also eine kleine Auswahlfunktion statt zweier kopierter Schleifen.
float() Menu_Options_Count =
{
    return MENU_TOUCH ? menu_opts_buttons_touch.length : menu_opts_buttons.length;
};

string(float i) Menu_Options_At =
{
    if (i < 0 || i >= Menu_Options_Count())
        return "";
    return MENU_TOUCH ? menu_opts_buttons_touch[i] : menu_opts_buttons[i];
};

string(string prev_id) Menu_Options_GetNextButton =
{
    if (prev_id == "")
        return Menu_Options_At(0);

    string ret = Menu_Options_At(0);

    for(float i = 0; i < Menu_Options_Count(); i++) {
        if (Menu_Options_At(i) == prev_id) {
            if (i + 1 >= Menu_Options_Count())
                break;

            ret = Menu_Options_At(i + 1);
            break;
        }
    }

    return ret;
};

string(string next_id) Menu_Options_GetPreviousButton =
{
    if (next_id == "")
        return Menu_Options_At(Menu_Options_Count() - 1);

    string ret = Menu_Options_At(Menu_Options_Count() - 1);

    for(float i = Menu_Options_Count() - 1; i > 0; i--) {
        if (Menu_Options_At(i) == next_id) {
            if (i - 1 < 0)
                break;

            ret = Menu_Options_At(i - 1);
            break;
        }
    }

    return ret;
};

void() Menu_Options =
{
	Menu_Page_Begin(MENU_TOUCH ? 5 : 6.25, 1);
    Menu_DrawBackground();
    Menu_DrawTitle(T("CONFIGURATION"));

    string language_label = Localization_IsGerman() ? "SPRACHE: DEUTSCH" : "LANGUAGE: ENGLISH";

    if (MENU_TOUCH) {
        // Auf dem Handy sieht die Liste anders aus, und zwar aus Gruenden:
        //  - Die Touch-Einstellungen (Empfindlichkeit, Y-Achse, Zielhilfe,
        //    Knopfgroesse, Linkshaender, Sparsam-Modus) liegen in der Web-Shell
        //    und waren vom Menue aus GAR NICHT erreichbar -- man musste erst ein
        //    Spiel starten. Diese Zeile schickt der Shell einen Marker.
        //  - STEUERUNG (Maus-Empfindlichkeit, Tastenbelegung), GAMEPAD und
        //    KONSOLE haben ohne Tastatur nichts zu bieten und fallen weg.
        menu_primary_id = "om_touch";
        Menu_Button(1, "om_touch", T("CONTROLS & DISPLAY"), "") ? print("\nTSUI:open:settings\n") : 0;
        Menu_Button(2, "om_video", T("VIDEO"), "") ? current_menu = MENU_VIDEO : 0;
        Menu_Button(3, "om_audio", T("AUDIO"), "") ? current_menu = MENU_AUDIO : 0;
        Menu_Button(4, "om_acces", T("ACCESSIBILITY"), "") ? current_menu = MENU_ACCESSIBILITY : 0;
        if (Menu_Button(5, "om_lang", language_label, "")) {
            localcmd(sprintf("seta cl_language %d\n", Localization_IsGerman() ? LANGUAGE_ENGLISH : LANGUAGE_GERMAN));
        }
    } else {
        Menu_Button(1, "om_video", T("VIDEO"), T("Visual Fidelity options.")) ? current_menu = MENU_VIDEO : 0;
        Menu_Button(2, "om_audio", T("AUDIO"), T("Volume sliders.")) ? current_menu = MENU_AUDIO : 0;
        Menu_Button(3, "om_binds", T("CONTROLS"), T("Control Options and Bindings.")) ? current_menu = MENU_CONTROL : 0;
        Menu_Button(4, "om_acces", T("ACCESSIBILITY"), T("Content, Interface, and Readability options.")) ? current_menu = MENU_ACCESSIBILITY : 0;
        Menu_DrawDivider(5);
        Menu_Button(5.25, "om_console", T("OPEN CONSOLE"), T("Access the Developer Console.")) ? localcmd("toggleconsole\n") : 0;

        if (Menu_Button(6.25, "om_lang", language_label, T("Switch the game language."))) {
            localcmd(sprintf("seta cl_language %d\n", Localization_IsGerman() ? LANGUAGE_ENGLISH : LANGUAGE_GERMAN));
        }
    }

#ifdef MENU

    Menu_Button(-1, "om_back", T("BACK"), T("Return to Main Menu.")) ? current_menu = MENU_MAIN : 0;

#else

    Menu_Button(-1, "om_back", T("BACK"), T("Return to Pause Menu.")) ? current_menu = MENU_PAUSE : 0;

#endif // MENU

	Menu_Page_End();

	sui_pop_frame();	
};