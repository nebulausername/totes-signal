var struct credits_s
{
	string header;
	string contributors[4];
};

string credits_totes[4] =
{
    "Deutsche Fassung, Steuerung, UI & Design",
    "",
    "",
    ""
};

string credits_tech[4] =
{
    "FTEQW Engine - Spike & Mitwirkende",
    "Freie Open-Source-Werkzeuge",
    "",
    ""
};

string credits_license[4] =
{
    "Freie Software unter GPL-2.0",
    "Basiert auf dem Open-Source-Projekt Nazi Zombies: Portable",
    "Inoffizielles Fanprojekt - nicht kommerziell",
    "Vollstaendige Credits: CREDITS.md im Projekt"
};

string credits_thx[4] =
{
    "An alle, die freie Spiele moeglich machen.",
    "Und an dich - fuers Durchhalten.",
    "",
    ""
};

credits_s credits[] =
{
    {
        "TOTES SIGNAL",
        {
            credits_totes[0],
            credits_totes[1],
            credits_totes[2],
            credits_totes[3]
        }
    },
    {
        "TECHNIK",
        {
            credits_tech[0],
            credits_tech[1],
            credits_tech[2],
            credits_tech[3]
        }
    },
    {
        "LIZENZ",
        {
            credits_license[0],
            credits_license[1],
            credits_license[2],
            credits_license[3]
        }
    },
    {
        "DANK",
        {
            credits_thx[0],
            credits_thx[1],
            credits_thx[2],
            credits_thx[3]
        }
    }
};

void() Menu_Credits =
{
    Menu_DrawBackground();
    Menu_DrawTitle(T("CREDITS"));
    Menu_DrawMapPanel();
    Menu_TextHintergrund();   // auf Touch die Unterlage fuer den Text

    for(int i = 0; i < credits.length; i++) {
        Menu_DrawCreditHeader(i, T(credits[i].header));

        for(int j = 0; j < 4; j++) {
            Menu_DrawCreditContributor(i, j, credits[i].contributors[j]);
        }
    }

    Menu_Button(-1, "cr_back", T("BACK"), T("Return to Main Menu.")) ? current_menu = MENU_MAIN : 0;

	sui_pop_frame();
};