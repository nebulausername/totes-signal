var struct credits_s
{
	string header;
	string contributors[4];
};

// Die NZ:P-Namen stehen wieder vorn (23.09.2026). Commit 05803a4 hatte sie
// beim Rebranding entfernt -- das Spiel ist aber zu rund 92 % ihre Arbeit.
// Quelle: der Original-Abspann (menu_cred.qc, nzp-team/quakec @ 6613eb72).
//
// Hoehenbudget auf Touch (siehe Menu_DrawCreditHeader): 4 Bloecke mit
// zusammen 9 Textzeilen -- exakt so viel wie vorher, sonst laeuft die letzte
// Zeile in ZURUECK. Wer eine Zeile ergaenzt, streicht woanders eine.
// Texte laufen durch T(): englischer Schluessel, deutsche Fassung in
// localization.qc. Keine Umlaute (Bitmap-Zeichensatz).
string credits_nzp[4] =
{
    "blubs, Jukki, cypress, Ju[s]tice, Derped_Crusader,",
    "BCDeshiG, Revnova, Naievil, Stoohp, Jacob Giguere,",
    "Lexi, DR_Mabuse1981, Scatterbox, Peter0x44, Marty P.,",
    "Biodude - thanks to Spike, eukara, Shpuld and more"
};

string credits_totes[4] =
{
    "Mobile version, German, co-op, UI & design",
    "",
    "",
    ""
};

string credits_license[4] =
{
    "Free software under GPL-2.0, engine: FTEQW (Spike et al.)",
    "Unofficial fan project - non-commercial",
    "Source: github.com/nebulausername/totes-signal",
    ""
};

string credits_thx[4] =
{
    "And to you - for holding out.",
    "",
    "",
    ""
};

credits_s credits[] =
{
    {
        "NZ:P TEAM",
        {
            credits_nzp[0],
            credits_nzp[1],
            credits_nzp[2],
            credits_nzp[3]
        }
    },
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
        "LICENSE & TECH",
        {
            credits_license[0],
            credits_license[1],
            credits_license[2],
            credits_license[3]
        }
    },
    {
        "THANKS",
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
            Menu_DrawCreditContributor(i, j, T(credits[i].contributors[j]));
        }
    }

    Menu_Button(-1, "cr_back", T("BACK"), T("Return to Main Menu.")) ? current_menu = MENU_MAIN : 0;

	sui_pop_frame();
};