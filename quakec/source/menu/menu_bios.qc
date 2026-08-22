string menu_bios_buttons[13] = {
    "bi_0", 
    "bi_1", 
    "bi_2", 
    "bi_3", 
    "bi_4", 
    "bi_5", 
    "bi_6", 
    "bi_7", 
    "bi_8", 
    "bi_9", 
    "bi_10", 
    "bi_11", 
    "bi_back"
};

var struct
{
    string name;
    string map;
    string portrait;
    vector portrait_coords;
    string description[17];
} menu_bio_info[] =
{
    {
        "KARL 'FUNKER' VOSS",
        "SENDETURM",
        "portrait_0.tga",
        [0, 0],
        {
            "Dreissig Jahre lang sass Karl Voss an den Reglern des",
            "Sendeturms und sprach in die Nacht. Als das Signal starb,",
            "blieb er als Einziger auf seinem Posten. Seitdem sendet er",
            "jede Stunde denselben Ruf in den Aether - und jede Stunde",
            "antwortet nur das Rauschen. Manche sagen, er hoere darin",
            "Stimmen. Karl sagt: solange gesendet wird, ist nicht Schluss.",
            "",
            "Staerke:    behaelt die Ruhe, wenn andere schreien.",
            "Schwaeche:  schlaeft mit offenen Augen neben dem Empfaenger.",
            "Bewaffnung: was der Werkzeugkasten hergibt.",
            "",
            "Letzter Funkspruch: 'Hier Sendeturm. Noch da. Ende.'",
            "",
            "",
            "",
            "",
            ""
        }
    },
    {
        "LENA 'STATIK' BRANDT",
        "TIEFENBUNKER",
        "portrait_0.tga",
        [0.5, 0],
        {
            "Lena Brandt hat den Tiefenbunker verkabelt, bevor die Welt",
            "draussen verstummte. Die Generatoren laufen nur, weil sie",
            "nachts mit dem Schraubenschluessel Wache haelt. Sie hoert",
            "im Rauschen der toten Frequenzen Muster: Zahlen, Namen,",
            "manchmal ihren eigenen. Niemand widerspricht ihr mehr -",
            "ihre Warnungen kamen bisher immer eine Runde zu frueh.",
            "",
            "Staerke:    repariert alles, was Funken schlaegt.",
            "Schwaeche:  vertraut Maschinen mehr als Menschen.",
            "Bewaffnung: praezise. Ein Schuss, ein Treffer.",
            "",
            "Notiz im Logbuch: 'Das Rauschen zaehlt mit.'",
            "",
            "",
            "",
            "",
            ""
        }
    },
    {
        "OTTO 'SCHRAUBE' KRUEGER",
        "WERKHALLE",
        "portrait_0.tga",
        [0, 0.5],
        {
            "Otto Krueger hat vor dem Ende Panzer geflickt; jetzt flickt",
            "er Barrikaden, Tueren und Menschen. Seine Werkhalle ist der",
            "letzte Ort, an dem noch etwas GANZ wird. Er redet wenig,",
            "raucht viel und zaehlt seine Schrauben wie andere Gebete.",
            "Wer eine Bresche schliessen muss, ruft nach Otto - und Otto",
            "kommt. Immer. Mit dem groessten Hammer, den er finden kann.",
            "",
            "Staerke:    baut aus Schrott eine Festung.",
            "Schwaeche:  verlaesst die Werkhalle nur unter Protest.",
            "Bewaffnung: alles mit Gewicht und Griff.",
            "",
            "Werkstattregel: 'Was wackelt, wird geschweisst.'",
            "",
            "",
            "",
            "",
            ""
        }
    },
    {
        "MIRA 'NACHTWACHE' HOFFMANN",
        "GRENZPOSTEN",
        "portrait_0.tga",
        [0.5, 0.5],
        {
            "Niemand weiss, wann Mira Hoffmann zuletzt geschlafen hat.",
            "Am Grenzposten zaehlt sie die Schatten im Nebel und traegt",
            "jede Runde in ihr Heft ein: wie viele kamen, wie viele",
            "fielen, wie lang die Nacht war. Ihre Zahlen stimmen immer.",
            "Wenn Mira sagt, dass heute mehr kommen, laedt man nach und",
            "schweigt. Wenn sie laechelt, ist es schon zu spaet.",
            "",
            "Staerke:    sieht sie zuerst. Immer.",
            "Schwaeche:  traut keiner Stille.",
            "Bewaffnung: Gewehr, Fernglas, kaltes Blut.",
            "",
            "Eintrag Nr. 447: 'Der Nebel hat heute Haende.'",
            "",
            "",
            "",
            "",
            ""
        }
    },
    {
        "??????????",
        "KEIN SIGNAL",
        "portrait_unknown.tga",
        [0, 0],
        {
            "Verbindung verloren.",
            "",
            "Wer hier draussen noch sendet, hat uns nicht erreicht.",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            ""
        }
    },
    {
        "??????????",
        "KEIN SIGNAL",
        "portrait_unknown.tga",
        [0, 0],
        {
            "Verbindung verloren.",
            "",
            "Wer hier draussen noch sendet, hat uns nicht erreicht.",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            ""
        }
    },
    {
        "??????????",
        "KEIN SIGNAL",
        "portrait_unknown.tga",
        [0, 0],
        {
            "Verbindung verloren.",
            "",
            "Wer hier draussen noch sendet, hat uns nicht erreicht.",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            ""
        }
    },
    {
        "??????????",
        "KEIN SIGNAL",
        "portrait_unknown.tga",
        [0, 0],
        {
            "Verbindung verloren.",
            "",
            "Wer hier draussen noch sendet, hat uns nicht erreicht.",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            ""
        }
    },
    {
        "??????????",
        "KEIN SIGNAL",
        "portrait_unknown.tga",
        [0, 0],
        {
            "Verbindung verloren.",
            "",
            "Wer hier draussen noch sendet, hat uns nicht erreicht.",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            ""
        }
    },
    {
        "??????????",
        "KEIN SIGNAL",
        "portrait_unknown.tga",
        [0, 0],
        {
            "Verbindung verloren.",
            "",
            "Wer hier draussen noch sendet, hat uns nicht erreicht.",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            ""
        }
    },
    {
        "??????????",
        "KEIN SIGNAL",
        "portrait_unknown.tga",
        [0, 0],
        {
            "Verbindung verloren.",
            "",
            "Wer hier draussen noch sendet, hat uns nicht erreicht.",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            ""
        }
    },
    {
        "??????????",
        "KEIN SIGNAL",
        "portrait_unknown.tga",
        [0, 0],
        {
            "Verbindung verloren.",
            "",
            "Wer hier draussen noch sendet, hat uns nicht erreicht.",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            ""
        }
    }
};

int menu_bios_biosubmenu;

string(string prev_id) Menu_Bios_GetNextButton =
{
    if (menu_bios_biosubmenu != 0)
        return "bi_back";

    if (prev_id == "")
        return menu_bios_buttons[0];

    string ret = menu_bios_buttons[0];

    for(float i = 0; i < menu_bios_buttons.length; i++) {
        if (menu_bios_buttons[i] == prev_id) {
            if (i + 1 >= menu_bios_buttons.length)
                break;

            ret = menu_bios_buttons[i + 1];
            break;
        }
    }

    return ret;
};

string(string next_id) Menu_Bios_GetPreviousButton =
{
    if (menu_bios_biosubmenu != 0)
        return "bi_back";

    if (next_id == "")
        return menu_bios_buttons[menu_bios_buttons.length - 1];

    string ret = menu_bios_buttons[menu_bios_buttons.length - 1];

    for(float i = menu_bios_buttons.length - 1; i > 0; i--) {
        if (menu_bios_buttons[i] == next_id) {
            if (i - 1 < 0)
                break;

            ret = menu_bios_buttons[i - 1];
            break;
        }
    }

    return ret;
};

void(int idx) Menu_Bios_EnterSubMenu =
{
    if (idx > 1)
        return;
    Menu_PlaySound(MENU_SND_ENTER);
    menu_bios_biosubmenu = idx;
};

void() Menu_Bios =
{
	Menu_Page_Begin(12, 1);
    Menu_DrawBackground();
    Menu_DrawTitle(T("CHARACTER BIOS"));
    Menu_DrawMapPanel();

    if (menu_bios_biosubmenu == 0)
    {
        for (float i = 0; i < 12; i++) {
            Menu_BioButton(
                i + 1, 
                sprintf("bi_%d", i), 
                menu_bio_info[i].name, 
                menu_bio_info[i].map, 
                menu_bio_info[i].portrait,
                menu_bio_info[i].portrait_coords
            ) ? Menu_Bios_EnterSubMenu(i + 1) : 0;
        }

        Menu_DrawDivider(11.5);

        Menu_Button(-1, "bi_back", T("BACK"), T("Return to Main Menu.")) ? current_menu = MENU_MAIN : 0;
    }
    else
    {

        Menu_DrawCharacterPanel(
            menu_bio_info[menu_bios_biosubmenu - 1].description[0],
            menu_bio_info[menu_bios_biosubmenu - 1].description[1],
            menu_bio_info[menu_bios_biosubmenu - 1].description[2],
            menu_bio_info[menu_bios_biosubmenu - 1].description[3],
            menu_bio_info[menu_bios_biosubmenu - 1].description[4],
            menu_bio_info[menu_bios_biosubmenu - 1].description[5],
            menu_bio_info[menu_bios_biosubmenu - 1].description[6],
            menu_bio_info[menu_bios_biosubmenu - 1].description[7],
            menu_bio_info[menu_bios_biosubmenu - 1].description[8],
            menu_bio_info[menu_bios_biosubmenu - 1].description[9],
            menu_bio_info[menu_bios_biosubmenu - 1].description[10],
            menu_bio_info[menu_bios_biosubmenu - 1].description[11],
            menu_bio_info[menu_bios_biosubmenu - 1].description[12],
            menu_bio_info[menu_bios_biosubmenu - 1].description[13],
            menu_bio_info[menu_bios_biosubmenu - 1].description[14],
            menu_bio_info[menu_bios_biosubmenu - 1].description[15],
            menu_bio_info[menu_bios_biosubmenu - 1].description[16]
        );

        Menu_Button(-1, "bi_back", T("BACK"), "") ? Menu_Bios_EnterSubMenu(0) : 0;
    }
    
	Menu_Page_End();

	sui_pop_frame();	
};