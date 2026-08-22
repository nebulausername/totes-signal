// TOTES SIGNAL — Dead-Signal-Palette (dunkel, Rost/Signalrot-Akzent, Knochenweiss).
vector MENU_BG = '0.11 0.10 0.10';
vector MENU_BG_DARK = '0.05 0.045 0.045';
vector MENU_BORDER = '0.5 0.16 0.07';
vector MENU_BUTTON = '0.16 0.13 0.12';
vector MENU_BUTTON_BORDER = '0.55 0.18 0.08';
vector MENU_TEXT_1 = '0.94 0.90 0.82';
vector MENU_TEXT_2 = '0.60 0.55 0.50';
vector MENU_HIGHLIGHT = '1 0.16 0.05';
vector MENU_DARKEN = '1 1 1';

vector MENU_TEXT_SUPERSMALL = '10 10 0';
vector MENU_TEXT_SMALL = '12 12 0';
vector MENU_TEXT_MEDIUM = '14 14 0';
vector MENU_TEXT_LARGE = '28 28 0';

// Touch-Kartenwahl: id der Karte, deren Vorschau gerade steht. Erster Tipp
// waehlt aus und zeigt Bild, Beschreibung und Badge; erst der zweite startet.
// Ohne das waehlt ein Handyspieler blind -- die Vorschau haengt im Original an
// is_hovered, und auf Touch entsteht nie ein Hover.
string menu_map_vorschau;

// Die eine Zeile, die der Spieler auf diesem Bildschirm am wahrscheinlichsten
// treffen will (SOLO, SPIEL STARTEN). Wird pro Frame zurueckgesetzt und vom
// Screen gesetzt -- ohne Hierarchie sieht CREDITS aus wie SOLO.
string menu_primary_id;

// Seitenblaetterung. Bei 60er-Zeilen passen auf ein Handy nur noch rund fuenf
// Zeilen zwischen die Leisten -- Screens wie die Kartenwahl (11 Zeilen) laufen
// sonst in die Fussleiste. Nur auf Touch aktiv; auf dem Desktop bleibt alles
// auf einer Seite. Die Sichtbarkeit steckt in Menu_PageOrder, die Aufrufe in
// den Screens (Menu_Button(3, ...)) bleiben unveraendert.
// Zeitpunkt des letzten Bildschirmwechsels -- Grundlage der Einblendung.
float menu_wechsel_zeit;

float menu_page;
float menu_page_total;
float menu_row_first;
float menu_row_count;

// ---------------------------------------------------------------------------
// Layout-Metrik
//
// Alle Basiswerte gelten fuer vid_conheight 480 -- den Raum, fuer den dieses
// Menue gebaut wurde und den die Web-Shell bei jedem TSUI:menu wiederherstellt.
// MENU_UI_SCALE rechnet sie auf den tatsaechlichen Frame um; noetig fuers
// PAUSEMENUE, das im HUD-Raum laeuft (480/380/300, vom Spieler einstellbar).
//
// Der Desktop-Zweig bildet die frueheren Zahlen exakt ab (Raster 25, Kasten
// 290x22) -- dort darf sich kein Pixel bewegen. Der Touch-Zweig ist die
// eigentliche Aenderung: 60er-Zeilen, damit die Klickflaeche auf einem Handy
// die 44-CSS-px-Empfehlung erreicht.
//
// Diese Datei wird in ZWEI Progs kompiliert (menu.dat und csprogs.dat) --
// jede absolute Zahl hier ist automatisch auch eine Pausemenue-Zahl.
// ---------------------------------------------------------------------------
float  MENU_TOUCH;          // 0 = Zeiger, 1 = Finger (cvar ts_touchui)
float  MENU_UI_SCALE;       // frame_h / 480
float  MENU_ROW_PITCH;      // Abstand zweier Zeilen
float  MENU_ROW_H;          // Hoehe der Klickflaeche
float  MENU_ROW_W;          // Breite der Klickflaeche
float  MENU_ROW_TOP;        // pos_y der Zeile order == 1   (START, von oben)
float  MENU_ROW_BOTTOM;     // pos_y der Zeile order == -1  (END, von unten)
float  MENU_LABEL_PAD;      // Innenabstand der Beschriftung
float  MENU_VALUE_X;        // x der Wertespalte
float  MENU_PANEL_X;        // x, ab dem das rechte Panel beginnt
float  MENU_BAR_TOP;        // Hoehe der Kopfleiste
float  MENU_BAR_BOTTOM;     // Hoehe der Fussleiste
float  MENU_DIVIDER_W;      // Breite der Trennlinie
float  MENU_ROWS_PER_PAGE;  // Zeilen zwischen erster Zeile und Fusszeile
vector MENU_LABEL_SIZE;
vector MENU_VALUE_SIZE;
vector MENU_DESC_SIZE;

void(vector frame) Menu_Metrics_Update =
{
	MENU_TOUCH = (cvar("ts_touchui") != 0);

	if (!MENU_TOUCH) {
		// Bit fuer Bit die alten Werte. MENU_ROW_TOP 70 == "45 + order*25" bei
		// order 1; MENU_ROW_BOTTOM -95 == "-70 + order*25" bei order -1.
		MENU_UI_SCALE   = 1;
		MENU_ROW_PITCH  = 25;
		MENU_ROW_H      = 22;
		MENU_ROW_W      = 290;
		MENU_ROW_TOP    = 70;
		MENU_ROW_BOTTOM = -95;
		MENU_LABEL_PAD  = 9;
		MENU_VALUE_X    = 320;
		MENU_PANEL_X    = 300;
		MENU_BAR_TOP    = 55;
		MENU_BAR_BOTTOM = 55;
		MENU_DIVIDER_W  = 285;
		MENU_LABEL_SIZE = MENU_TEXT_MEDIUM;
		MENU_VALUE_SIZE = MENU_TEXT_MEDIUM;
		MENU_DESC_SIZE  = MENU_TEXT_MEDIUM;
	} else {
		MENU_UI_SCALE   = frame_y / 480;
		MENU_ROW_PITCH  = 60 * MENU_UI_SCALE;
		MENU_ROW_H      = 60 * MENU_UI_SCALE;   // luecklos: Luecken zwischen
		MENU_ROW_TOP    = 60 * MENU_UI_SCALE;   // Trefferflaechen sind auf Touch
		MENU_ROW_BOTTOM = -59 * MENU_UI_SCALE;  // verschenkter Platz
		MENU_ROW_W      = min(620 * MENU_UI_SCALE, frame_x - 24 * MENU_UI_SCALE);
		MENU_LABEL_PAD  = 16 * MENU_UI_SCALE;
		MENU_VALUE_X    = 0;                    // 0 = rechtsbuendig in der Zeile
		MENU_PANEL_X    = MENU_ROW_W + 24 * MENU_UI_SCALE;
		MENU_BAR_TOP    = 55 * MENU_UI_SCALE;
		MENU_BAR_BOTTOM = 55 * MENU_UI_SCALE;
		MENU_DIVIDER_W  = MENU_ROW_W;
		MENU_LABEL_SIZE = [22, 22, 0] * MENU_UI_SCALE;
		MENU_VALUE_SIZE = [20, 20, 0] * MENU_UI_SCALE;
		MENU_DESC_SIZE  = [18, 18, 0] * MENU_UI_SCALE;
	}

	// Wie viele Zeilen liegen zwischen der ersten Zeile und der Fusszeile (-1)?
	float fuss_oben = MENU_ROW_BOTTOM + frame_y - MENU_ROW_H;
	MENU_ROWS_PER_PAGE = floor((fuss_oben - MENU_ROW_TOP) / MENU_ROW_PITCH);
	if (MENU_ROWS_PER_PAGE < 1) MENU_ROWS_PER_PAGE = 1;

	// Jeder Frame beginnt ohne Blaetterung; wer sie braucht, ruft Menu_Page_Begin.
	menu_primary_id = "";
	menu_row_first  = 0;
	menu_row_count  = 0;
	menu_page_total = 1;
};

//
// Menu_Page_Begin(max_order) / Menu_Page_End()
// Klammern einen Screen, dessen Zeilen auf einem Handy nicht mehr auf eine
// Seite passen. max_order ist die hoechste benutzte Zeilennummer.
// Fusszeilen (order <= 0) bleiben ausgenommen -- ZURUECK steht immer.
//
void(float max_order, float fusszeilen) Menu_Page_Begin =
{
	if (!MENU_TOUCH) return;

	// Jede zusaetzliche Fusszeile (UEBERNEHMEN neben ZURUECK) frisst eine
	// Inhaltszeile: sie waechst von unten in denselben Raum hinein.
	float pro_seite = MENU_ROWS_PER_PAGE - (fusszeilen - 1);
	if (pro_seite < 1) pro_seite = 1;
	if (max_order <= pro_seite + 0.001) return;

	menu_row_count  = pro_seite;
	menu_page_total = ceil(max_order / menu_row_count);
	menu_page       = bound(0, menu_page, menu_page_total - 1);
	menu_row_first  = 1 + menu_page * menu_row_count;
};

//
// Menu_PageOrder(order)
// Logische Zeilennummer -> Bildschirmzeile, oder 0 wenn sie auf dieser Seite
// nicht vorkommt. Beim Blaettern werden gebrochene Nummern (3.25, 5.5 -- im
// Original blosse Abstandshalter) auf ganze Zeilen gelegt, sonst rutscht die
// letzte Zeile in die Fusszeile.
//
float(float order) Menu_PageOrder =
{
	if (order <= 0 || menu_row_count <= 0) return order;
	if (order < menu_row_first) return 0;
	if (order >= menu_row_first + menu_row_count) return 0;
	return floor(order - menu_row_first) + 1;
};

//
// Menu_PanelHintergrund()
// Der dunkle Streifen rechts mit der gelben Kante. Auf dem Desktop stuetzt er
// die Wertespalte und wird von fast jedem Bildschirm gezeichnet.
//
void() Menu_PanelHintergrund =
{
	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_START]);
	float hoehe = sui_current_frame_size()[1] - MENU_BAR_TOP - MENU_BAR_BOTTOM - 3;
	sui_fill([MENU_PANEL_X, MENU_BAR_TOP], [sui_current_frame_size()[0], hoehe], [0, 0, 0], 0.9, 0);
	sui_fill([MENU_PANEL_X, MENU_BAR_TOP], [max(3, 3 * MENU_UI_SCALE), hoehe], [1, 1, 0], 0.9, 0);
};

//
// Menu_Uhr()
// Zeitquelle fuer die Einblendung. Im PAUSEMENUE steht `time` still -- das Spiel
// ist pausiert (cmd pause), und eine Animation gegen eine stehende Uhr erreicht
// ihr Ende nie: die Zeilen blieben dauerhaft am linken Rand abgeschnitten
// stehen. cltime laeuft unabhaengig weiter, gibt es aber nur in CSQC.
//
float() Menu_Uhr =
{
#ifdef MENU
	return time;
#else
	return cltime;
#endif
};

//
// Menu_RowEinblendung(order)
// Waagerechter Versatz waehrend der Einblendung. Jede Zeile laeuft etwas spaeter
// ein als die darueber -- der Blick folgt der Liste, statt sie fertig
// vorzufinden. Nur auf Touch; auf dem Desktop springt das Menue wie bisher.
//
float(float order) Menu_RowEinblendung =
{
	if (!MENU_TOUCH || menu_wechsel_zeit <= 0) return 0;
	float stufe = (order > 0) ? floor(order) : 6;      // Fusszeilen zuletzt
	float t = (Menu_Uhr() - menu_wechsel_zeit - (stufe - 1) * 0.028) / 0.16;
	t = bound(0, t, 1);
	return (1 - t) * (1 - t) * -46 * MENU_UI_SCALE;    // weich auslaufend
};

//
// Menu_PageButton(id, x, breite, beschriftung)
// Quadratischer Knopf in der Fusszeile, fuer das Blaettern. Eigene Funktion,
// weil Menu_Button an das Zeilenraster gebunden ist.
//
float(string id, float x, float breite, string beschriftung) Menu_PageButton =
{
	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_END]);

	vector box  = [x + Menu_RowEinblendung(-1), MENU_ROW_BOTTOM];
	vector groesse = [breite, MENU_ROW_H];

	float gedrueckt = sui_is_pressed_at(box, groesse);
	float hell = sui_is_hovered(id) || gedrueckt;

	sui_fill(box, groesse, [0, 0, 0], hell ? 0.95 : 0.55, 0);
	sui_fill(box, [groesse_x, max(2, 2 * MENU_UI_SCALE)],
	         hell ? [0.8, 0.11, 0.03] : [0.35, 0.08, 0.03], 1, 0);

	float rest = (MENU_ROW_H - MENU_LABEL_SIZE_y) * 0.5;
	sui_text(box + [(breite - getTextWidth(beschriftung, MENU_LABEL_SIZE_x)) * 0.5, 0 - rest],
	         MENU_LABEL_SIZE, beschriftung,
	         hell ? [1, 0.16, 0.06] : [0.94, 0.90, 0.82], 1, 0);

	sui_action_element(box, groesse, id, sui_noop);
	return sui_is_clicked(id);
};

//
// Menu_Page_End()
// Blaetter-Bedienung rechts in der Fusszeile: "<"  2/3  ">".
// Nach der letzten Zeile aufrufen, aber VOR dem sui_pop_frame des Screens --
// danach zeichnet alles in einen Nullframe (siehe Kommentar dort).
//
void() Menu_Page_End =
{
	if (menu_page_total <= 1) return;

	float bw     = MENU_ROW_H;
	float zaehl  = 70 * MENU_UI_SCALE;
	float rechts = MENU_ROW_W;

	if (Menu_PageButton("pg_next", rechts - bw, bw, ">")) {
		Menu_PlaySound(MENU_SND_ENTER);
		menu_page = min(menu_page + 1, menu_page_total - 1);
		menu_wechsel_zeit = Menu_Uhr();
	}
	if (Menu_PageButton("pg_prev", rechts - bw - zaehl - bw, bw, "<")) {
		Menu_PlaySound(MENU_SND_ENTER);
		menu_page = max(menu_page - 1, 0);
		menu_wechsel_zeit = Menu_Uhr();
	}

	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_END]);
	string zaehler = sprintf("%d/%d", menu_page + 1, menu_page_total);
	float rest = (MENU_ROW_H - MENU_VALUE_SIZE_y) * 0.5;
	sui_text([rechts - bw - zaehl + (zaehl - getTextWidth(zaehler, MENU_VALUE_SIZE_x)) * 0.5,
	          MENU_ROW_BOTTOM - rest],
	         MENU_VALUE_SIZE, zaehler, [0.94, 0.90, 0.82], 0.9, 0);
	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_START]);
};

//
// Menu_RowBox(order)
// Obere linke Ecke der Zeilenflaeche, in DER Ausrichtung, die der Aufrufer
// vorher gesetzt hat: order > 0 zaehlt von oben (START), order <= 0 von unten
// (END). -1 ist per Konvention ZURUECK, -2 UEBERNEHMEN.
//
vector(float order) Menu_RowBox =
{
	// Einblendung: die Zeilen laufen von links ein, jede etwas spaeter als die
	// darueber. Nur auf Touch -- auf dem Desktop springt das Menue wie bisher.
	// Der Versatz trifft Flaeche UND Klickflaeche (beide kommen aus dieser
	// Funktion), waehrend der 160 ms wandert die Trefferflaeche also mit. Das
	// ist gewollt: was man sieht, ist was man trifft.
	float ein = Menu_RowEinblendung(order);

	if (order > 0) {
		// Auf Touch ganze Zeilen. Die gebrochenen Ordnungszahlen des Originals
		// (3.25, 5.5, 6.25) waren Abstandshalter fuer das enge 25er-Raster --
		// bei 60er-Zeilen erzeugen sie nur ungleiche Luecken.
		float o = MENU_TOUCH ? floor(order) : order;
		return [ein, MENU_ROW_TOP + (o - 1) * MENU_ROW_PITCH];
	}
	return [ein, MENU_ROW_BOTTOM + (order + 1) * MENU_ROW_PITCH];
};

//
// Menu_RowFill(box, groesse, farbe, alpha)
// Flaeche einer Zeile mit weicher rechter Kante. sui_fill kann keinen Verlauf,
// also sechs gestapelte Rechtecke mit fallender Deckkraft -- ein harter Schnitt
// mitten im Hintergrundbild sieht nach Fehler aus, nicht nach Absicht.
// Alle Stufen mit GLEICHER Hoehe: unter SUI_ALIGN_END wuerden unterschiedlich
// hohe Rechtecke gegeneinander verrutschen.
//
void(vector box, vector groesse, vector farbe, float alpha) Menu_RowFill =
{
	float fade = min(90 * MENU_UI_SCALE, groesse_x * 0.35);
	float voll = groesse_x - fade;
	sui_fill(box, [voll, groesse_y], farbe, alpha, 0);

	float stufen = 6;
	float breit  = fade / stufen;
	for (int i = 0; i < stufen; i++) {
		float a = alpha * (1 - (i + 1) / stufen);
		sui_fill(box + [voll + i * breit, 0], [breit + 1, groesse_y], farbe, a, 0);
	}
};

//
// Menu_RowTextPos(box, order, text, size)
// Position der Beschriftung innerhalb der Zeile. Die Umrechnung ist nicht
// trivial: sui_text transformiert mit der TEXTBREITE und der Texthoehe,
// sui_fill dagegen mit der Kastengroesse -- unter SUI_ALIGN_END verschiebt das
// beide gegeneinander um (Kastenhoehe - Texthoehe).
//
vector(vector box, float order, string text, vector size) Menu_RowTextPos =
{
	if (!MENU_TOUCH) {
		// Original: rechtsbuendig, und die alte 5/3-Asymmetrie beibehalten.
		float dy = (order > 0) ? 5 : 3;
		return box + [MENU_ROW_W - MENU_LABEL_PAD - getTextWidth(text, size_x), dy];
	}

	// Touch: linksbuendig, senkrecht in der Zeile zentriert.
	float rest = (MENU_ROW_H - size_y) * 0.5;
	if (order > 0)
		return box + [MENU_LABEL_PAD, rest];
	return box + [MENU_LABEL_PAD, 0 - rest];
};

//
// Menu_ValuePos(order, text, size)
// Position der Wertespalte. Auf dem Desktop eine eigene Spalte bei x=320; auf
// Touch gibt es die nicht -- der Wert steht rechtsbuendig in derselben Zeile
// wie die Beschriftung (MENU_VALUE_X == 0).
//
vector(float order, string text, vector size) Menu_ValuePos =
{
	vector box = Menu_RowBox(order);

	if (MENU_VALUE_X > 0)
		return [MENU_VALUE_X, box_y + ((order > 0) ? 5 : 3)];

	float rest = (MENU_ROW_H - size_y) * 0.5;
	return [MENU_ROW_W - MENU_LABEL_PAD - getTextWidth(text, size_x),
	        box_y + ((order > 0) ? rest : (0 - rest))];
};

//
// Menu_InputBox(order)
// Kasten eines Texteingabefeldes. Auf dem Desktop in der Wertespalte, auf Touch
// in der Zeile selbst. (Ohne Bildschirmtastatur sind die Felder auf dem Handy
// ohnehin nicht bedienbar -- sie sollen nur nicht daneben liegen.)
//
vector(float order) Menu_InputBox =
{
	if (MENU_VALUE_X > 0)
		return [MENU_VALUE_X, 45 + (order * 25)];
	return Menu_RowBox(order);
};

float menu_leftarrow_pressed;
float menu_rightarrow_pressed;


void() input_tester =
{
	float char = 0;
	float scan = 0;
	string printme = "";
	while (sui_get_input(char, scan))
	{
		printme = strcat(printme, chr2str(char));
	}
};

void(string id, vector pos, vector size, float maxlen, __inout string text, __inout float cursor) text_input_control =
{
	vector textsize = [size_y - 4, size_y - 4];
	sui_push_frame(pos, size);
	vector basecolor = sui_is_hovered(id) ? MENU_BG_DARK + MENU_HIGHLIGHT * 0.08 : MENU_BG_DARK; 
	sui_fill([0, 0], size, basecolor, 0.6, 0);
	
	sui_text_input(id, [0, 0], size, maxlen, text, cursor);

	sui_cap_input_length(maxlen, text, cursor);
	
	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_CENTER]);
	float focused = sui_is_last_clicked(id);
	// Under focus
	focused ? sui_border_box([0, 0], size, 1, MENU_BORDER, 0.6, 0) : 0;	
	
	sui_push_frame([2, 0], [size_x - 4, size_y - 4]);
	
	float cursorx;
	if (stringwidth(text, 1, textsize) > size_x - 4)
	{
		sui_clip_to_frame();
		cursorx = 0;
		sui_set_align([SUI_ALIGN_END, SUI_ALIGN_CENTER]);
		sui_text([0, 0], textsize, text, MENU_TEXT_1, 1, 0);
	}
	else
	{
		cursorx = stringwidth(substring(text, 0, cursor), 1, textsize);
		sui_text([0, 0], textsize, text, MENU_TEXT_1, 1, 0);
	}
	if (focused) 
	{
		sui_fill([cursorx, 0], [2, textsize_y], MENU_TEXT_1, fabs(sin(time * 4)), 0);
	}
	sui_reset_clip();
	sui_pop_frame();
	
	sui_pop_frame();
};

//
// Menu_DrawDivider(order)
// Draws a division line between menu
// entries.
//
void(float order) Menu_DrawDivider =
{

	// Auf Touch weglassen: bei 60er-Zeilen mit sichtbarer Flaeche trennen die
	// Zeilen sich selbst, und die gebrochenen Ordnungszahlen der Trenner
	// kollidieren beim Blaettern mit den Knopfzeilen.
	if (MENU_TOUCH) return;

	order = Menu_PageOrder(order);
	if (!order) return;
	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_START]);

	// Sitzt auf der Oberkante der Zeile "order".
	vector position = Menu_RowBox(order);
	sui_fill(position, [MENU_DIVIDER_W, max(2, 2 * MENU_UI_SCALE)], [0.2, 0.2, 0.2], 1, 0);
};

#ifdef MENU

//
// Menu_DrawMapPreview()
// Draws the Map preview seen in the
// Pre-Game menu.
//
string UserMapNameLookup(string bsp_name);
void() Menu_DrawMapPreview =
{
	string map_preview_name = UserMapNameLookup(current_selected_bsp);
	sui_set_align([SUI_ALIGN_CENTER, SUI_ALIGN_CENTER]);

	// Map thumbnail -- x wie in Menu_MapButton die halbe Panelkante.
	float vx = MENU_PANEL_X * 0.5;

	if (MENU_TOUCH) {
		Menu_PanelHintergrund();
		// Im Panel liegt darunter die Einstellungsliste: Bild nach oben und
		// kleiner, sonst ueberlagern sich beide.
		float fb = sui_current_frame_size()[0];
		float pb = fb - MENU_PANEL_X;
		float bb = pb * 0.52;
		float bh = bb * 0.5625;
		// Linke Kante statt Zentrierung: sui_* zentriert unter SUI_ALIGN_CENTER
		// nach der jeweiligen Elementgroesse -- Bild, Rahmen und Text lägen
		// dann unterschiedlich weit links.
		sui_set_align([SUI_ALIGN_START, SUI_ALIGN_CENTER]);
		float bx = MENU_PANEL_X + (pb - bb) * 0.5;
		sui_fill([bx - 2, -152], [bb + 4, bh + 4], [0.4, 0.4, 0.4], 1, 0);
		sui_pic([bx, -150], [bb, bh], strcat("menu/custom/", current_selected_bsp, ".png"), [1, 1, 1], 1, 0);
		// Name auf das Bild legen: darunter beginnt sofort die Einstellungsliste.
		sui_fill([bx, -150 + bh - MENU_DESC_SIZE_y - 6], [bb, MENU_DESC_SIZE_y + 6], [0, 0, 0], 0.65, 0);
		sui_text([bx + 4, -150 + bh - MENU_DESC_SIZE_y - 3], MENU_DESC_SIZE, map_preview_name, [1, 1, 0], 1, 0);
		sui_set_align([SUI_ALIGN_CENTER, SUI_ALIGN_CENTER]);
		return;
	}

	sui_fill([vx, 100], [228, 130], [0.4, 0.4, 0.4], 1, 0);
	sui_pic([vx, 100], [225, 127], strcat("menu/custom/", current_selected_bsp, ".png"), [1, 1, 1], 1, 0);

	sui_text([vx, 152], MENU_VALUE_SIZE, map_preview_name, [1, 1, 0], 1, 0);
};

#endif // MENU

//
// Menu_SocialBadge(order, id, text, index)
// Displays a social badge with a URL
// when hovered over with the mouse.
//
void(float order, string id, string text, float index) Menu_SocialBadge =
{
	sui_set_align([SUI_ALIGN_END, SUI_ALIGN_END]);

	vector position = [-6, -62 - ((order - 1) * 30)];
	vector coords_size = [0.5, 0.5];
	vector coords_pos = [0, 0];

	switch(index) {
		case 1: coords_pos = [0, 0]; break;
		case 2: coords_pos = [0.5, 0]; break;
		case 3: coords_pos = [0, 0.5]; break;
		case 4: coords_pos = [0.5, 0.5]; break;
	}

	sui_subpic(position, [28, 28], "gfx/menu/social", [1, 1, 1], coords_pos, coords_size, 1, 0);

	if (sui_is_hovered(id)) {
		sui_fill(position - [36, 8], [getTextWidth(text, MENU_TEXT_SUPERSMALL_x) + 1, 10], [0, 0, 0], 0.9, 0);
		sui_text(position - [35, 8], MENU_TEXT_SUPERSMALL, text, [1, 1, 0], 1, 0);
	}

	sui_action_element(position, [28, 28], id, sui_noop);
};

//
// Menu_DrawYesNoPanel()
// Draws a ribbon over the screen typically used
// for Yes/No message boxes.
//
void(string line_1, string line_2) Menu_DrawYesNoPanel =
{
	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_START]);
	sui_fill([0, 0], sui_current_frame_size(), [0.01, 0, 0], 0.5, 0);

	// BESTEHENDER FEHLER, hier behoben: der schwarze Block lag absolut auf
	// y 160..320, der untere gelbe Rand aber relativ auf frame_h - 160. Nur bei
	// vid_conheight 480 fielen beide zusammen. Das Pausemenue laeuft aber im
	// HUD-Raum, den der Spieler selbst einstellt: bei Preset "Gross" (380) sass
	// der Rand mitten im Block, bei "Sehr gross" (300) OBERHALB davon.
	float breite = sui_current_frame_size()[0];
	float hoehe  = sui_current_frame_size()[1];
	// Die Ja/Nein-Knoepfe sitzen INNERHALB des Panels. Bei 60er-Zeilen brauchen
	// zwei davon plus zwei Textzeilen mehr als die alten 160 Einheiten.
	float oben   = hoehe * (MENU_TOUCH ? (120.0 / 480) : (160.0 / 480));
	float block  = hoehe * (MENU_TOUCH ? (280.0 / 480) : (160.0 / 480));
	float linie  = max(3, 3 * MENU_UI_SCALE);

	// Black Fill
	sui_fill([0, oben], [breite, block], [0, 0, 0], 1, 0);

	// Yellow borders
	sui_fill([0, oben], [breite, linie], [1, 1, 0], 0.9, 0);
	sui_fill([0, oben + block - linie], [breite, linie], [1, 1, 0], 0.9, 0);

	sui_set_align([SUI_ALIGN_CENTER, SUI_ALIGN_START]);
	vector tg = MENU_TOUCH ? MENU_LABEL_SIZE : MENU_TEXT_MEDIUM;
	float  ty = MENU_TOUCH ? (oben + 12 * MENU_UI_SCALE) : (oben + block * 0.0625 + 10);
	sui_text([0, ty], tg, line_1, [1, 1, 1], 1, 0);
	sui_text([0, ty + tg_y + 6], tg, line_2, [1, 1, 1], 1, 0);
	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_START]);
};

//
// Menu_DrawCharacterPanel()
// Draws a ribbon over the screen used
// for lengthy character bios.
//
void(string l1, string l2, string l3, string l4, string l5, string l6, string l7, string l8, string l9, string l10, string l11, string l12, string l13, string l14, string l15, string l16, string l17) Menu_DrawCharacterPanel =
{
	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_START]);
	sui_fill([0, 0], sui_current_frame_size(), [0.01, 0, 0], 0.5, 0);

	// Black Fill
	sui_fill([0, 50], [sui_current_frame_size()[0], sui_current_frame_size()[1] - 100], [0, 0, 0], 1, 0);

	// Yellow borders
	sui_fill([0, 50], [sui_current_frame_size()[0], 3], [1, 1, 0], 0.9, 0);
	sui_fill([0, sui_current_frame_size()[1] - 53], [sui_current_frame_size()[0], 3], [1, 1, 0], 0.9, 0);

	sui_set_align([SUI_ALIGN_CENTER, SUI_ALIGN_START]);
	// Auf Touch groesser und weiter gesetzt: 14 virtuelle px sind rund 11
	// CSS-px -- der einzige Bildschirm, der die Skalierung nicht mitbekam.
	// 17 Zeilen zu 20 ab 68 enden bei 388; das Panel reicht bis frame_h-50.
	vector tg = MENU_TOUCH ? MENU_DESC_SIZE : MENU_TEXT_MEDIUM;
	float  ty = MENU_TOUCH ? 68 : 110;
	float  ts = MENU_TOUCH ? 20 : 15;
	sui_text([0, ty + 0 * ts], tg, l1, [1, 1, 1], 1, 0);
	sui_text([0, ty + 1 * ts], tg, l2, [1, 1, 1], 1, 0);
	sui_text([0, ty + 2 * ts], tg, l3, [1, 1, 1], 1, 0);
	sui_text([0, ty + 3 * ts], tg, l4, [1, 1, 1], 1, 0);
	sui_text([0, ty + 4 * ts], tg, l5, [1, 1, 1], 1, 0);
	sui_text([0, ty + 5 * ts], tg, l6, [1, 1, 1], 1, 0);
	sui_text([0, ty + 6 * ts], tg, l7, [1, 1, 1], 1, 0);
	sui_text([0, ty + 7 * ts], tg, l8, [1, 1, 1], 1, 0);
	sui_text([0, ty + 8 * ts], tg, l9, [1, 1, 1], 1, 0);
	sui_text([0, ty + 9 * ts], tg, l10, [1, 1, 1], 1, 0);
	sui_text([0, ty + 10 * ts], tg, l11, [1, 1, 1], 1, 0);
	sui_text([0, ty + 11 * ts], tg, l12, [1, 1, 1], 1, 0);
	sui_text([0, ty + 12 * ts], tg, l13, [1, 1, 1], 1, 0);
	sui_text([0, ty + 13 * ts], tg, l14, [1, 1, 1], 1, 0);
	sui_text([0, ty + 14 * ts], tg, l15, [1, 1, 1], 1, 0);
	sui_text([0, ty + 15 * ts], tg, l16, [1, 1, 1], 1, 0);
	sui_text([0, ty + 16 * ts], tg, l17, [1, 1, 1], 1, 0);
	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_START]);
};

//
// Menu_DrawMapPanel()
// Draws a translucent box on the right
// side of the window to make map text easier
// to read.
//
void() Menu_DrawMapPanel =
{
	// Auf Touch gibt es keine Wertespalte mehr -- die Werte stehen in der Zeile.
	// Der Streifen blieb dadurch auf den meisten Bildschirmen LEER und schnitt
	// nur das Hintergrundbild ab. Im Vergleich sah BARRIEREFREIHEIT (das ihn nie
	// zeichnete) deutlich lebendiger aus. Gezeichnet wird er hier deshalb nur
	// noch auf dem Desktop; wo auf Touch wirklich Inhalt im Panel steht
	// (Kartenvorschau, Lobby, Steckbriefe), holt ihn die jeweilige Stelle sich
	// selbst ueber Menu_PanelHintergrund().
	if (MENU_TOUCH) return;
	Menu_PanelHintergrund();
};

//
// Menu_DrawOptionValue(order, value)
// Draws the value of the option at a given order.
//
void(float order, string value) Menu_DrawOptionValue =
{

	order = Menu_PageOrder(order);
	if (!order) return;
	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_START]);

	sui_text(Menu_ValuePos(order, value, MENU_VALUE_SIZE), MENU_VALUE_SIZE, value, [1, 1, 1], 1, 0);
};

//
// Menu_DrawOptionKey(order, value)
// Draws a key/glyph at a given order.
//
void(float order, string bind) Menu_DrawOptionKey =
{

	order = Menu_PageOrder(order);
	if (!order) return;
	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_START]);

	vector position = Menu_ValuePos(order, bind, MENU_VALUE_SIZE);
	float keynum = stringtokeynum(bind);

	if (keynum >= 816 && keynum <= 839) {
		vector tilemap_position = [0, 0];

		// Get the position of the button in the tilemap.
		switch(keynum) {
			case K_GP_A: tilemap_position = [0, 0]; break;
			case K_GP_B: tilemap_position = [0.125, 0]; break;
			case K_GP_X: tilemap_position = [0.250, 0]; break;
			case K_GP_Y: tilemap_position = [0.375, 0]; break;
			case K_GP_LSHOULDER: tilemap_position = [0.250, 0.125]; break;
			case K_GP_RSHOULDER: tilemap_position = [0.375, 0.125]; break;
			case K_GP_LTRIGGER: tilemap_position = [0.500, 0.125]; break;
			case K_GP_RTRIGGER: tilemap_position = [0.625, 0.125]; break;
			case K_GP_BACK: tilemap_position = [0.875, 0.125]; break;
			case K_GP_START: tilemap_position = [0.750, 0.125]; break;
			case K_GP_LTHUMB: tilemap_position = [0, 0.125]; break;
			case K_GP_RTHUMB: tilemap_position = [0.125, 0.125]; break;
			case K_GP_DPAD_UP: tilemap_position = [0.500, 0]; break;
			case K_GP_DPAD_DOWN: tilemap_position = [0.625, 0]; break;
			case K_GP_DPAD_LEFT: tilemap_position = [0.750, 0]; break;
			case K_GP_DPAD_RIGHT: tilemap_position = [0.875, 0]; break;
		}

		float kachel = MENU_VALUE_SIZE_x + 5;
		sui_subpic([position_x, position_y - 2], [kachel, kachel], sprintf("gfx/controller_glyphs/%s.tga", cvar_string("cl_controllerglyphs")), [1, 1, 1], tilemap_position, [0.125, 0.125], 1, 0);
	}
	else {
		sui_text(position, MENU_VALUE_SIZE, bind, [1, 1, 0], 1, 0);
	}
};

//
// Menu_BioButton(order, id, char_name, map, portrait, coords)
// Displays a fancy menu option that loads
// and draws the details for the given
// character in the Bios menu.
//
float(float order, string id, string char_name, string map, string portrait, vector coords) Menu_BioButton =
{

	// Seitenblaetterung: gehoert die Zeile nicht auf diese Seite, wird sie
	// gar nicht erst gezeichnet UND nicht als Klickflaeche registriert.
	// Muss VOR sui_is_hovered stehen -- das hat Nebenwirkungen (Navigationston).
	order = Menu_PageOrder(order);
	if (!order) return FALSE;
	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_START]);

	vector bbox_pos  = Menu_RowBox(order);
	vector bbox_size = [MENU_ROW_W, MENU_ROW_H];

	float is_hovered = sui_is_hovered(id);
	float is_pressed = MENU_TOUCH ? sui_is_pressed_at(bbox_pos, bbox_size)
	                              : sui_is_held(id);
	float lit = is_hovered || is_pressed;
	// Auf Touch bleibt der Steckbrief stehen, nachdem der Finger weg ist --
	// sonst saehe ihn niemand (es gibt keinen Hover).
	float zeigen = MENU_TOUCH ? sui_is_last_clicked(id) : is_hovered;
	vector text_color = lit ? [1, 0, 0] : [1, 1, 1];
	float kante = max(2, 2 * MENU_UI_SCALE);

	if (MENU_TOUCH && !lit && !zeigen)
		sui_fill(bbox_pos, bbox_size, [0, 0, 0], 0.35, 0);

	if (lit || zeigen) {
		// Background
		sui_fill(bbox_pos, bbox_size, [0, 0, 0], 0.9, 0);
		// Top
		sui_fill(bbox_pos, [bbox_size_x, kante], [0.4, 0, 0], 1, 0);
		// Bottom
		sui_fill(bbox_pos + [0, bbox_size_y - kante], [bbox_size_x, kante], [0.4, 0, 0], 1, 0);
		// Right
		sui_fill(bbox_pos + [bbox_size_x - kante, 0], [kante, bbox_size_y], [0.4, 0, 0], 1, 0);
	}

	// Character Name
	sui_text(Menu_RowTextPos(bbox_pos, order, strtoupper(char_name), MENU_LABEL_SIZE),
	         MENU_LABEL_SIZE, strtoupper(char_name), text_color, 1, 0);

	if (zeigen) {
		if (MENU_TOUCH) Menu_PanelHintergrund();
		sui_set_align([SUI_ALIGN_CENTER, SUI_ALIGN_CENTER]);

		// Character Portrait
		sui_fill([150, -30], [264, 264], [0.4, 0.4, 0.4], 1, 0);
		sui_subpic([150, -30], [260, 260], strcat("gfx/portraits/", portrait), [1, 1, 1], coords, [0.5, 0.5], 1, 0);

		// Map
		sui_set_align([SUI_ALIGN_CENTER, SUI_ALIGN_END]);
		sui_text([0, -30], MENU_TEXT_MEDIUM, map, [1, 1, 0], 1, 0);
	
		sui_set_align([SUI_ALIGN_START, SUI_ALIGN_START]);
	}

	sui_action_element(bbox_pos, bbox_size, id, sui_noop);
	
	return sui_is_clicked(id);
}

//
// Menu_MapButton(order, id, bsp_name, map_category, usermap_index)
// Displays a fancy menu option that loads
// and draws the details for the given
// .BSP.
//
float(float order, string id, string bsp_name, float map_category, float usermap_index) Menu_MapButton =
{

	// Seitenblaetterung: gehoert die Zeile nicht auf diese Seite, wird sie
	// gar nicht erst gezeichnet UND nicht als Klickflaeche registriert.
	// Muss VOR sui_is_hovered stehen -- das hat Nebenwirkungen (Navigationston).
	order = Menu_PageOrder(order);
	if (!order) return FALSE;
	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_START]);

	vector bbox_pos  = Menu_RowBox(order);
	vector bbox_size = [MENU_ROW_W, MENU_ROW_H];

	float is_hovered = sui_is_hovered(id);
	float is_pressed = MENU_TOUCH ? sui_is_pressed_at(bbox_pos, bbox_size)
	                              : sui_is_held(id);
	float lit = is_hovered || is_pressed;
	// Vorschaubild, Beschreibung und Badge haengen im Original an is_hovered --
	// auf Touch entsteht nie ein Hover, der Spieler waehlte also blind aus einer
	// Liste nackter Zeilen. Auf Touch bleibt die Vorschau darum an der zuletzt
	// angetippten Karte stehen.
	float zeigen = MENU_TOUCH ? (menu_map_vorschau == id) : is_hovered;
	vector text_color = lit ? [1, 0, 0] : [1, 1, 1];
	float kante = max(2, 2 * MENU_UI_SCALE);

	if (MENU_TOUCH && !lit && !zeigen)
		sui_fill(bbox_pos, bbox_size, [0, 0, 0], 0.35, 0);

	if (lit || zeigen) {
		// Background
		sui_fill(bbox_pos, bbox_size, [0, 0, 0], 0.9, 0);
		// Top
		sui_fill(bbox_pos, [bbox_size_x, kante], [0.4, 0, 0], 1, 0);
		// Bottom
		sui_fill(bbox_pos + [0, bbox_size_y - kante], [bbox_size_x, kante], [0.4, 0, 0], 1, 0);
		// Right
		sui_fill(bbox_pos + [bbox_size_x - kante, 0], [kante, bbox_size_y], [0.4, 0, 0], 1, 0);
	}

	int i;
	int index = 0;

	// Draw the map data from stock_maps
	if (usermap_index == -1) {
		for(i = 0; i < stock_maps.length; i++) {
			if (stock_maps[i].bsp_name == bsp_name) {
				index = stock_maps[i].array_index;
				break;
			}
		}
	} else {
		index = usermap_index;
	}

	// Map title
	string title = user_maps[index].map_name_pretty;
	if (!title)
		title = user_maps[index].map_name;
	// Auf Touch bekommt jede Zeile ihr Kartenbild. Eine Liste aus reinen
	// Grossbuchstaben sagt einem Spieler nichts ueber die Karte -- und der Platz
	// links neben der Beschriftung liegt ohnehin brach.
	float vorschau_b = 0;
	if (MENU_TOUCH && user_maps[index].map_use_thumbnail) {
		float th = MENU_ROW_H - 12 * MENU_UI_SCALE;
		float tb = th * 16 / 9;
		float tx = 14 * MENU_UI_SCALE;          // hinter dem Signalbalken
		float ty = (MENU_ROW_H - th) * 0.5;
		sui_fill(bbox_pos + [tx - 1, ty - 1], [tb + 2, th + 2], [0.38, 0.11, 0.05], 1, 0);
		sui_pic(bbox_pos + [tx, ty], [tb, th],
		        strcat("menu/custom/", user_maps[index].map_name, ".png"),
		        (lit || zeigen) ? [1, 1, 1] : [0.82, 0.78, 0.74], 1, 0);
		vorschau_b = tx + tb + 14 * MENU_UI_SCALE;
	}

	vector titelpos = Menu_RowTextPos(bbox_pos, order, strtoupper(title), MENU_LABEL_SIZE);
	if (vorschau_b > 0) titelpos_x = bbox_pos_x + vorschau_b;
	sui_text(titelpos, MENU_LABEL_SIZE, strtoupper(title), text_color, 1, 0);

	if (zeigen) {
		if (MENU_TOUCH) Menu_PanelHintergrund();
		sui_set_align([SUI_ALIGN_CENTER, SUI_ALIGN_CENTER]);

		// Der x-Versatz ist die halbe Panelkante -- auf dem Desktop ergibt das
		// exakt die frueheren 150, auf Touch wandert die Vorschau mit dem
		// breiteren Zeilenblock nach rechts ins Panel.
		float vx = MENU_PANEL_X * 0.5;

		// Map thumbnail
		if (user_maps[index].map_use_thumbnail) {
			sui_fill([vx, -70], [302, 174], [0.4, 0.4, 0.4], 1, 0);
			sui_pic([vx, -70], [300, 170], strcat("menu/custom/", user_maps[index].map_name, ".png"), [1, 1, 1], 1, 0);
		}
			
		// Map description
		for(i = 0; i < 8; i++) {
			sui_text([vx, 30 + (i * 14)], MENU_TEXT_SMALL, user_maps[index].map_desc[i], [1, 1, 1], 1, 0);
		}

		// Map Badge
		string badge_name = "";
		vector coords_size = [0.25, 0.5];
		vector coords_pos = [0, 0];

		switch(map_category) {
			case MAP_CATEGORY_NZPBETA: coords_pos = [0, 0]; badge_name = "KLASSIK (2011)"; break;
			case MAP_CATEGORY_WAW: coords_pos = [0.25, 0]; badge_name = "FRONT-KLASSIKER"; break;
			case MAP_CATEGORY_NZP: coords_pos = [0, 0.5]; badge_name = "ORIGINAL"; break;
			case MAP_CATEGORY_BLACKOPSDS: coords_pos = [0.25, 0.5]; badge_name = "HANDHELD-AERA"; break;
			case MAP_CATEGORY_USER: coords_pos = [0.5, 0]; badge_name = "EIGENE KARTE"; break;
		}

		float bx = vx - 150;   // linke Kante des Vorschaubildes
		sui_text([bx + 30 + (getTextWidth(badge_name, MENU_TEXT_SUPERSMALL_x)/2), 5], MENU_TEXT_SUPERSMALL, badge_name, [1, 1, 0], 1, 0);
		sui_subpic([bx + 12, 4], [20, 20], "gfx/menu/map_badges", [1, 1, 1], coords_pos, coords_size, 1, 0);

		// Author/Description -- auf Touch weggelassen: die Zeile liegt in der
		// Fussleiste und stiesse dort mit der Wortmarke zusammen; der Kartenname
		// steht ohnehin in der Zeile und spaeter in der Lobby.
		if (user_maps[index].map_author != "" && !MENU_TOUCH) {
			sui_set_align([SUI_ALIGN_CENTER, SUI_ALIGN_END]);
			string author = user_maps[index].map_author;

			sui_text([0, -30], MENU_TEXT_MEDIUM, title, [1, 1, 1], 1, 0);
			sui_text([0, -15], MENU_TEXT_MEDIUM, author, [1, 1, 0], 1, 0);
		}
	
		sui_set_align([SUI_ALIGN_START, SUI_ALIGN_START]);
	}

	sui_action_element(bbox_pos, bbox_size, id, sui_noop);
	
	float geklickt = sui_is_clicked(id);
	if (!MENU_TOUCH || !geklickt)
		return geklickt;

	// Touch, zweistufig: der erste Tipp waehlt nur aus (und laesst damit Bild,
	// Beschreibung und Badge stehen), erst ein zweiter Tipp auf DIESELBE Zeile
	// startet. Sonst waehlt ein Handyspieler ohne jede Information.
	if (menu_map_vorschau == id)
		return TRUE;

	menu_map_vorschau = id;
	return FALSE;
}

//
// Menu_GreyButton(order, title)
// Draws Grey (unselect-able text) in place of
// menu button.
//
void(float order, string title) Menu_GreyButton =
{

	order = Menu_PageOrder(order);
	if (!order) return;
	vector alignment;

	if (order > 0) alignment = [SUI_ALIGN_START, SUI_ALIGN_START];
	else alignment = [SUI_ALIGN_START, SUI_ALIGN_END];

	sui_set_align(alignment);

	vector text_color = [0.5, 0.3, 0.3]; // make it kinda red, for flavor.
	vector box = Menu_RowBox(order);

	// Auf Touch dieselbe Flaeche wie eine normale Zeile, nur gedaempft -- sonst
	// steht der gesperrte Eintrag als schwebender Text zwischen Flaechen und
	// sieht aus wie ein Zeichenfehler statt wie "gerade nicht verfuegbar".
	if (MENU_TOUCH) {
		Menu_RowFill(box, [MENU_ROW_W, MENU_ROW_H], [0, 0, 0], 0.28);
		sui_fill(box, [max(3, 4 * MENU_UI_SCALE), MENU_ROW_H], [0.20, 0.07, 0.05], 1, 0);
		text_color = [0.46, 0.31, 0.28];
	}

	sui_text(Menu_RowTextPos(box, order, title, MENU_LABEL_SIZE),
	         MENU_LABEL_SIZE, title, text_color, 1, 0);
};

//
// Menu_Button(order, id, title, description)
// Displays a menu option and draws the description
// plus flair if selected.
//
float(float order, string id, string title, string description) Menu_Button =
{

	// Seitenblaetterung: gehoert die Zeile nicht auf diese Seite, wird sie
	// gar nicht erst gezeichnet UND nicht als Klickflaeche registriert.
	// Muss VOR sui_is_hovered stehen -- das hat Nebenwirkungen (Navigationston).
	order = Menu_PageOrder(order);
	if (!order) return FALSE;
	vector alignment;

	if (order > 0) alignment = [SUI_ALIGN_START, SUI_ALIGN_START];
	else alignment = [SUI_ALIGN_START, SUI_ALIGN_END];

	sui_set_align(alignment);

	vector bbox_pos  = Menu_RowBox(order);
	vector bbox_size = [MENU_ROW_W, MENU_ROW_H];

	// Sitzt rechts in der Fusszeile ein Pager, macht ZURUECK ihm Platz.
	if (order == -1 && menu_page_total > 1)
		bbox_size_x -= 2 * MENU_ROW_H + 70 * MENU_UI_SCALE + MENU_LABEL_PAD;

	float is_hovered = sui_is_hovered(id);
	// Auf Touch gibt es keinen Hover -- ohne einen Druckzustand haette der
	// Spieler ueberhaupt keine Rueckmeldung. sui_is_held reicht dafuer nicht:
	// _hold_actions wird beim Down aus der Hover-Liste kopiert, und genau deren
	// Verspaetung ist der Grund, warum es den Tap-Nachzuegler in sui_end gibt.
	float is_pressed = MENU_TOUCH ? sui_is_pressed_at(bbox_pos, bbox_size)
	                              : sui_is_held(id);
	float lit = is_hovered || is_pressed;
	vector text_color = lit ? [1, 0.16, 0.06] : [0.94, 0.90, 0.82];
	// Auf der roten Waschung der Primaerzeile liest sich rote Schrift nicht --
	// dort bleibt es bei Knochenweiss.
	if (MENU_TOUCH && id == menu_primary_id) text_color = [1, 0.97, 0.92];

	if (MENU_TOUCH) {
		float primaer = (id == menu_primary_id);

		// Grundflaeche IMMER: vorher sah der Spieler nur schwebenden Text und
		// hatte keinen Hinweis, wo er hintippen soll.
		Menu_RowFill(bbox_pos, bbox_size, [0, 0, 0], lit ? 0.90 : 0.42);

		// Die wahrscheinlichste Zeile bekommt einen Schein, der vom Signalbalken
		// nach rechts auslaeuft -- damit SOLO nicht aussieht wie CREDITS. Eine
		// flaechig rote Zeile las sich wie eine Warnung statt wie ein Angebot,
		// deshalb nur die linken ~42 % (der Rest ist ohnehin Verlauf).
		if (primaer)
			Menu_RowFill(bbox_pos, [bbox_size_x * 0.42, bbox_size_y],
			             [0.90, 0.11, 0.02], lit ? 0.40 : 0.26);
		if (is_pressed)
			Menu_RowFill(bbox_pos, bbox_size, [1, 0.16, 0.05], 0.16);

		// Signal-Balken LINKS statt rechts: an der Lesekante liest er sich als
		// Zeilenmarke, an der weichen rechten Kante haette er keinen Halt.
		float ab = max(3, (primaer ? 8 : 4) * MENU_UI_SCALE);
		vector abfarbe = [0.32, 0.09, 0.05];
		if (primaer) abfarbe = [1, 0.20, 0.05];
		if (lit)     abfarbe = [1, 0.36, 0.12];
		sui_fill(bbox_pos, [ab, bbox_size_y], abfarbe, 1, 0);
		// Weicher Saum rechts neben dem Balken, damit er nicht wie aufgeklebt wirkt.
		if (primaer || lit)
			sui_fill(bbox_pos + [ab, 0], [ab * 0.75, bbox_size_y], abfarbe, 0.35, 0);

		// Feine Trennkante nach unten -- haelt den Rhythmus lesbar, ohne dass
		// jede Zeile einen eigenen Rahmen braucht.
		if (!lit)
			sui_fill(bbox_pos + [0, bbox_size_y - 1], [bbox_size_x * 0.55, 1], [1, 1, 1], 0.07, 0);
	}
	else if (lit) {
		// Beschreibung
		sui_set_align([SUI_ALIGN_CENTER, SUI_ALIGN_END]);
		sui_text([0, -30], MENU_DESC_SIZE, description, [0.94, 0.90, 0.82], 1, 0);
		sui_set_align(alignment);

		// Background
		sui_fill(bbox_pos, bbox_size, [0, 0, 0], is_pressed ? 0.95 : 0.9, 0);

		float kante = max(2, 2 * MENU_UI_SCALE);
		if (order > 0) {
			sui_fill(bbox_pos, [bbox_size_x, kante], [0.8, 0.11, 0.03], 1, 0);
			sui_fill(bbox_pos + [0, bbox_size_y - kante], [bbox_size_x, kante], [0.8, 0.11, 0.03], 1, 0);
		} else {
			sui_fill(bbox_pos - [0, bbox_size_y], [bbox_size_x, kante], [0.8, 0.11, 0.03], 1, 0);
			sui_fill(bbox_pos, [bbox_size_x, kante], [0.8, 0.11, 0.03], 1, 0);
		}

		float akzent = max(3, 3 * MENU_UI_SCALE);
		sui_fill(bbox_pos + [bbox_size_x - akzent, 0], [akzent, bbox_size_y],
		         is_pressed ? [1, 0.45, 0.15] : [1, 0.18, 0.05], 1, 0);

		if (is_pressed)
			sui_fill(bbox_pos, bbox_size, [1, 0.16, 0.05], 0.18, 0);
	}

	sui_text(Menu_RowTextPos(bbox_pos, order, title, MENU_LABEL_SIZE),
	         MENU_LABEL_SIZE, title, text_color, 1, 0);
	sui_action_element(bbox_pos, bbox_size, id, sui_noop);
	
	return sui_is_clicked(id);
};

//
// Menu_StepButton(id, pos, groesse, zeichen)
// Quadratische Flaeche fuer [-] und [+] im Stepper. Eigene Funktion, weil sie
// nicht am Zeilenraster haengt, sondern IN einer Zeile sitzt.
//
float(string id, vector pos, float groesse, string zeichen) Menu_StepButton =
{
	vector g = [groesse, groesse];
	float gedrueckt = sui_is_pressed_at(pos, g);
	float hell = sui_is_hovered(id) || gedrueckt;

	sui_fill(pos, g, [0, 0, 0], hell ? 0.95 : 0.55, 0);
	sui_fill(pos, [groesse, max(2, 2 * MENU_UI_SCALE)],
	         hell ? [1, 0.32, 0.10] : [0.38, 0.11, 0.05], 1, 0);

	sui_text(pos + [(groesse - getTextWidth(zeichen, MENU_LABEL_SIZE_x)) * 0.5,
	                (groesse - MENU_LABEL_SIZE_y) * 0.5],
	         MENU_LABEL_SIZE, zeichen,
	         hell ? [1, 0.20, 0.06] : [0.94, 0.90, 0.82], 1, 0);

	sui_action_element(pos, g, id, sui_noop);
	return sui_is_clicked(id);
};

//
// Menu_SettingsFooter(apply_id, back_id, anwenden)
// Fusszeile eines Einstellungsbildschirms. Auf dem Desktop wie bisher
// UEBERNEHMEN + ZURUECK. Auf Touch entfaellt UEBERNEHMEN: ein Knopf, den man
// druecken MUSS, damit die Aenderung bleibt, ist auf dem Handy eine Falle --
// und er kostet eine der fuenf Zeilen. Stattdessen wird beim Verlassen
// gesichert, mit genau derselben Funktion wie zuvor der Knopf.
// Gibt TRUE zurueck, wenn der Bildschirm verlassen werden soll.
//
float(string apply_id, string back_id, void() anwenden) Menu_SettingsFooter =
{
	if (!MENU_TOUCH) {
		Menu_Button(-2, apply_id, T("APPLY"), T("Save & Apply Settings.")) ? anwenden() : 0;
		return Menu_Button(-1, back_id, T("BACK"), T("Return to Configuration Menu."));
	}

	if (Menu_Button(-1, back_id, T("BACK"), "")) {
		anwenden();
		return TRUE;
	}
	return FALSE;
};

float(string id, vector pos, vector size, string text) my_button =
{
	sui_push_frame(pos, size);
	vector basecolor = sui_is_hovered(id) ? MENU_BUTTON + MENU_HIGHLIGHT * 0.1 : MENU_BUTTON; 
	basecolor = sui_is_held(id) ? MENU_BUTTON - MENU_DARKEN * 0.1 : basecolor;
	sui_fill([0, 0], size, basecolor, 0.6, 0);
	sui_border_box([0, 0], size, 1, MENU_BUTTON_BORDER, 0.4, 0);
	
	sui_set_align([SUI_ALIGN_CENTER, SUI_ALIGN_CENTER]);
	sui_text([0, 0], MENU_TEXT_SMALL, text, MENU_TEXT_1, 1, 0);	
	sui_action_element([0, 0], size, id, sui_noop);
	sui_pop_frame();
	
	return sui_is_clicked(id);
};


//
// Menu_DrawControllerGlyphDemo(order)
// Draws ABXY on the same line as an OptionVal to demonstrate
// the current cl_controllerglyphs value.
//
void(float order) Menu_DrawControllerGlyphDemo =
{

	order = Menu_PageOrder(order);
	if (!order) return;
	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_START]);

	vector tilemap_positions[4] = {[0, 0], [0.125, 0], [0.250, 0], [0.375, 0]};
	float  schritt = MENU_VALUE_SIZE_x;
	vector position;
	if (MENU_VALUE_X > 0) {
		position = [450, 50 + (order * 25)];
	} else {
		vector box = Menu_RowBox(order);
		position = [MENU_ROW_W - MENU_LABEL_PAD - 4 * schritt,
		            box_y + (MENU_ROW_H - schritt) * 0.5];
	}

	for(int i = 0; i < 4; i++) {
		sui_subpic(position, [schritt, schritt], sprintf("gfx/controller_glyphs/%s.tga", cvar_string("cl_controllerglyphs")), [1, 1, 1], tilemap_positions[i], [0.125, 0.125], 1, 0);
		position_x += schritt;
	}
};

//
// Menu_DrawCreditHeader()
// Wrapper for drawing the role/title in credits.
//
//
// Menu_TextHintergrund()
// Dunkle Flaeche ueber dem Inhaltsbereich, fuer reine Textbildschirme. Seit das
// Panel auf Touch nur noch dort gezeichnet wird, wo Inhalt steht, braucht der
// Credits-Text eine eigene Unterlage -- sonst liegt er ungeschuetzt auf dem
// Hintergrundbild.
//
void() Menu_TextHintergrund =
{
	if (!MENU_TOUCH) return;
	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_START]);
	float hoehe = sui_current_frame_size()[1] - MENU_BAR_TOP - MENU_BAR_BOTTOM - 3;
	sui_fill([0, MENU_BAR_TOP], [sui_current_frame_size()[0], hoehe], [0, 0, 0], 0.78, 0);
};

// Laufende Hoehe im Credits-Bildschirm. Das 60er-Raster der Vorlage laesst bei
// groesserer Schrift Luecken, wo ein Block nur eine Zeile hat -- auf Touch wird
// deshalb fortlaufend gesetzt statt gerastert.
float menu_credit_y;

void(float order, string header) Menu_DrawCreditHeader =
{
	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_START]);

	if (MENU_TOUCH) {
		// Nachgerechnet: 4 Kopfzeilen (20+3) + 9 Textzeilen (18+1) + 3 Blockluft
		// = 281 Einheiten. Ab 63 endet das bei 344, die Fusszeile beginnt bei
		// 361. Mit den urspruenglichen Abstaenden lief die letzte Zeile in
		// ZURUECK hinein.
		if (order <= 0) menu_credit_y = MENU_BAR_TOP + 8 * MENU_UI_SCALE;
		else            menu_credit_y += 6 * MENU_UI_SCALE;
		sui_text([MENU_LABEL_PAD, menu_credit_y], MENU_VALUE_SIZE, header, [1, 1, 0], 1, 0);
		menu_credit_y += MENU_VALUE_SIZE_y + 3 * MENU_UI_SCALE;
		return;
	}

	vector position = [8, 60 + (order * 60)];
	sui_text(position - [getTextWidth(header, MENU_TEXT_SMALL_x), 0, 0] + [275, 0, 0], MENU_TEXT_SMALL, header, [1, 1, 0], 1, 0);
};

//
// Menu_DrawCreditContributor()
// Wrapper for drawing the contributor list in credits.
//
void(float order, float sub_order, string header) Menu_DrawCreditContributor =
{
	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_START]);

	if (MENU_TOUCH) {
		if (header == "") return;   // leere Plaetze kosten sonst eine Zeilenhoehe
		sui_text([MENU_LABEL_PAD + 20 * MENU_UI_SCALE, menu_credit_y],
		         MENU_DESC_SIZE, header, [0.94, 0.90, 0.82], 1, 0);
		menu_credit_y += MENU_DESC_SIZE_y + 1 * MENU_UI_SCALE;
		return;
	}

	vector position = [315, 60 + (order * 60)];
	position_y += sub_order * (MENU_TEXT_SUPERSMALL_x + 3);
	sui_text(position, MENU_TEXT_SUPERSMALL, header, [1, 1, 1], 1, 0);
};

//
// Menu_DrawBuildDate()
// Wrapper for drawing the build date
// retrieved from nzp/version.txt
//
void() Menu_DrawBuildDate =
{
	sui_set_align([SUI_ALIGN_END, SUI_ALIGN_START]);
	sui_text([-6, 8], MENU_TEXT_SMALL, "TOTES SIGNAL  v1.0", [0.70, 0.68, 0.60], 1, 0);
	sui_text([-6, 22], MENU_TEXT_SMALL, sprintf(T("Welcome, %s"), cvar_string("name")), [0.90, 0.60, 0.15], 1, 0);
};

//
// Menu_DrawBackground()
// Wrapper for drawing menu background,
// i.e., the Zombie pose with a black
// background for readibility, and some
// style lines.
//
void() Menu_DrawBackground =
{
	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_START]);

#ifdef MENU

	float elapsed_background_time = time - menu_starttime;

	// 
	// Slight background pan
	//
	float x_pos = 0 - (((sui_current_frame_size()[0] * 1.05) - sui_current_frame_size()[0]) * (elapsed_background_time/7));

	sui_pic([x_pos, 0], [sui_current_frame_size()[0] * 1.05, sui_current_frame_size()[1]], menu_background, [0.85, 0.8, 0.78], 1, 1);
	sui_fill([0, 0], sui_current_frame_size(), [0.03, 0.0, 0.0], 0.58, 0);   // Waschung: dunkel genug fuer Text, hell genug fuer die neuen BGs

	//
	// Fade new images in/out
	//
	float alpha = 0;

	if (elapsed_background_time < 1.0) {
        alpha = 1.0f - sin((elapsed_background_time / 1.0f) * (M_PI / 2));  // Opacity from 1 -> 0
    } else if (elapsed_background_time < 6.0f) {
        alpha = 0.0f;
    } else if (elapsed_background_time < 7.0f) {
        alpha = sin(((elapsed_background_time - 6.0f) / 1.0f) * (M_PI / 2));  // Opacity from 0 -> 1
    }

	sui_fill([0, 0], sui_current_frame_size(), [0, 0, 0], alpha, 0);

#else

	sui_fill([0, 0], sui_current_frame_size(), [0, 0, 0], 0.8, 0);

#endif // MENU

	float breite = sui_current_frame_size()[0];
	float hoehe  = sui_current_frame_size()[1];
	float linie  = max(3, 3 * MENU_UI_SCALE);

	// Top Bars
	sui_fill([0, 0], [breite, MENU_BAR_TOP], [0, 0, 0], 0.9, 0);
	sui_fill([0, MENU_BAR_TOP - linie], [breite, linie], [0.55, 0.10, 0.03], 1, 0);

	// Bottom Bars
	sui_fill([0, hoehe - MENU_BAR_BOTTOM], [breite, MENU_BAR_BOTTOM], [0, 0, 0], 0.9, 0);
	sui_fill([0, hoehe - MENU_BAR_BOTTOM - linie], [breite, linie], [0.55, 0.10, 0.03], 1, 0);

	// Persistente TOTES-SIGNAL-Wortmarke, zentriert in der Unterleiste (jeder Screen).
	// Auf Touch nur einzeilig: die Fussleiste ist dort knapp und die Zeile
	// darueber ist eine Klickflaeche.
	sui_set_align([SUI_ALIGN_CENTER, SUI_ALIGN_END]);
	if (MENU_TOUCH) {
		sui_text([0, 0 - (MENU_BAR_BOTTOM - MENU_LABEL_SIZE_y) * 0.5], MENU_LABEL_SIZE,
		         "TOTES SIGNAL", [0.85, 0.12, 0.04], 0.9, 0);
	} else {
		sui_text([0, -21], MENU_TEXT_SMALL, "TOTES SIGNAL", [0.85, 0.12, 0.04], 0.9, 0);
		sui_text([0, -9],  MENU_TEXT_SUPERSMALL, "TOTERSIGNAL.DE", [0.5, 0.46, 0.42], 0.75, 0);
	}
	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_START]);
};

//
// Menu_DrawTitle(menu_title)
// Wrapper for drawing the current Menu title
// in the desired location + at the desired size.
//
void(string menu_title) Menu_DrawTitle =
{
	// Der grosse Masthead ("TOTES SIGNAL") steckt in Menu_DrawBackground; hier
	// nur noch der kleine Sektionsname oben links + rote Signal-Linie darunter.
	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_START]);
	vector groesse = MENU_TOUCH ? (MENU_LABEL_SIZE * 1.18) : MENU_TEXT_SMALL;
	// -4 ist so gewaehlt, dass der Desktop-Fall (Leiste 55, Schrift 12) exakt
	// auf der alten y=36 landet und die Signal-Linie auf y=49.
	float  oben    = MENU_BAR_TOP - max(3, 3 * MENU_UI_SCALE) - groesse_y - 4;
	sui_text([9, oben + 1], groesse, menu_title, [0.55, 0.05, 0.02], 0.8, 0);   // Rot-Glow
	sui_text([8, oben],     groesse, menu_title, [0.95, 0.90, 0.82], 1, 0);     // Knochenweiss
	sui_fill([8, oben + groesse_y + 1], [getTextWidth(menu_title, groesse_x) + 6, max(2, 2 * MENU_UI_SCALE)], [0.8, 0.11, 0.03], 0.9, 0);
};

void(string id, vector pos, vector size, vector minmaxsteps, __inout float value) my_slider =
{
	sui_push_frame(pos, size);
	
	value = sui_slidercontrol(id, [0, 0], size, minmaxsteps, value, sui_slider_noop);
	float maxval = minmaxsteps[1];
	float sliderx = (value / maxval) * size_x;
	sui_fill([0, size_y * 0.25], [size_x, size_y * 0.5], [0.5, 0.1, 0.1], 1.0, 0);
	sui_fill([sliderx - 2, 0], [4, size_y], [0.6, 0.4, 0.4], 1.0, 0);
	
	sui_pop_frame();
};

void(vector pos, vector size, vector minmaxsteps, string cvar_s, string name, string format) cvar_slider =
{
	float current = cvar(cvar_s);
	float old = current;
	sui_push_frame(pos, [size_x, size_y * 0.5 - 4]);
	sui_text([0, 0], MENU_TEXT_SMALL, name, MENU_TEXT_1, 1, 0);
	sui_set_align([SUI_ALIGN_END, SUI_ALIGN_START]);
	sui_text([0, 0], MENU_TEXT_SMALL, sprintf(format, current), MENU_TEXT_1, 1, 0);
	sui_pop_frame();
	my_slider(strcat(cvar_s, "sldr"), [pos_x, pos_y + size_y * 0.5], [size_x, size_y * 0.5], minmaxsteps, current);
	if (current != old) cvar_set(cvar_s, ftos(current));
};

//
// Menu_CvarSlider(order, button_id, minmaxsteps, cvar_s, is_int, no_text, zero_is_one)
// Draws a Slider at the given order position
// that controls a cvar.
//
void(float order, string button_id, vector minmaxsteps, string cvar_s, float is_int, float no_text, float zero_is_one) Menu_CvarSlider =
{

	order = Menu_PageOrder(order);
	if (!order) return;
	float current = cvar(cvar_s);
	float old = current;

	vector zahlpos = [0, 0];

	if (MENU_TOUCH) {
		// Kein Schieber auf Touch, sondern [-] Wert [+]. Zwei Gruende: eine
		// deutsche Beschriftung wie GESAMTLAUTSTAERKE braucht fast die ganze
		// Zeilenbreite und lief dem Schieber ins Bild; und ein 15 px hoher
		// Griff ist mit dem Daumen ohnehin nicht zu fassen. Der Stepper ist
		// kompakt, kollisionsfrei und jede Flaeche ist ~44 CSS-px gross.
		vector box = Menu_RowBox(order);
		float  bw  = MENU_ROW_H - 6 * MENU_UI_SCALE;
		float  wb  = 78 * MENU_UI_SCALE;                      // Platz fuer den Wert
		float  y   = box_y + (MENU_ROW_H - bw) * 0.5;
		float  xp  = MENU_ROW_W - MENU_LABEL_PAD - bw;        // [+] ganz rechts
		float  xm  = xp - wb - bw;                            // [-] links daneben

		// Schrittweite: die Vorlage rastert fuer Maus und Pfeiltasten sehr fein
		// (SICHTFELD haette 140 Stufen). Mit dem Daumen sind das zu viele Tipps,
		// also mindestens ein Zwanzigstel des Bereichs pro Tipp.
		float spanne  = minmaxsteps[1] - minmaxsteps[0];
		float schritt = max(spanne / minmaxsteps[2], spanne / 20);

		if (Menu_StepButton(strcat(cvar_s, "minus"), [xm, y], bw, "-")) current -= schritt;
		if (Menu_StepButton(strcat(cvar_s, "plus"),  [xp, y], bw, "+")) current += schritt;

		current = bound(minmaxsteps[0], current, minmaxsteps[1]);
		zahlpos = [xm + bw, box_y + (MENU_ROW_H - MENU_VALUE_SIZE_y) * 0.5];
	}
	else {
		vector position = [MENU_VALUE_X, 50 + (order * 25)];
		vector size = [150, 30];
		vector reglerpos     = [position_x, (position_y - 17) + size_y * 0.5];
		vector reglergroesse = [size_x, size_y * 0.5];
		zahlpos              = position + [175, 0, 0];

		my_slider(strcat(cvar_s, "sldr"), reglerpos, reglergroesse, minmaxsteps, current);
	}

	// For keyboard/gamepad navigation -- we need to check if the button associated
	// with this slider is active and then do input checks to test if we should
	// adjust the related cvar.
	if (sui_is_hovered(button_id)) {
		float interval = ((minmaxsteps[1] - minmaxsteps[0]) / minmaxsteps[2]);
		if (menu_leftarrow_pressed) {
			current -= interval;
		} else if (menu_rightarrow_pressed) {
			current += interval;
		}

		if (current < minmaxsteps[0])
			current = minmaxsteps[0];

		if (current > minmaxsteps[1])
			current = minmaxsteps[1];
	}

	if (current != old) {
		if (is_int)
			cvar_set(cvar_s, ftos(rint(current)));
		else
			cvar_set(cvar_s, ftos(current));
	}

	if (!no_text) {
		float number_to_draw = current;

		if (number_to_draw == 0 && zero_is_one == true)
			number_to_draw = 1;

		string wert = is_int ? ftos(rint(number_to_draw)) : sprintf("%.2f", number_to_draw);
		if (MENU_TOUCH)   // mittig zwischen [-] und [+]
			zahlpos_x += (78 * MENU_UI_SCALE - getTextWidth(wert, MENU_VALUE_SIZE_x)) * 0.5;
		sui_text(zahlpos, MENU_VALUE_SIZE, wert, [1, 1, 1], 1, 0);
	}
	else if (MENU_TOUCH) {
		// Auch ohne Zahlenanzeige braucht der Spieler eine Rueckmeldung: ein
		// kurzer Balken zeigt, wo im Bereich der Wert steht (Lautstaerken).
		// QuakeC kennt nur Funktions-Scope -- eigene Namen statt Wiederverwendung.
		vector bbox = Menu_RowBox(order);
		float  kb   = MENU_ROW_H - 6 * MENU_UI_SCALE;
		float  kw   = 78 * MENU_UI_SCALE;
		float  kx   = MENU_ROW_W - MENU_LABEL_PAD - kb - kw - kb;
		float  anteil = (minmaxsteps[1] > minmaxsteps[0])
		              ? (current - minmaxsteps[0]) / (minmaxsteps[1] - minmaxsteps[0]) : 0;
		float  ky   = bbox_y + MENU_ROW_H * 0.5 - 2;
		sui_fill([kx + kb + 6, ky], [kw - 12, 4], [0.30, 0.10, 0.06], 1, 0);
		sui_fill([kx + kb + 6, ky], [(kw - 12) * anteil, 4], [1, 0.26, 0.08], 1, 0);
	}
};

static void(string id, vector pos, vector size, __inout string text, __inout float cursor) handle_text_input =
{
	// best length to fit the largest character in the font
	// ex: AAAAAAAAAAAAAAAAAAAAAAA
	float maxlen = 23;

	sui_action_element(pos, size, id, sui_noop);
	if (sui_is_clicked(id)) cursor = strlen(text);
	if (sui_is_hovered(id))
	{
		float char = 0;
		float scan = 0;
		while(sui_get_input(char, scan)) sui_handle_text_input(char, scan, maxlen, text, cursor);
	}
};

static void(string id, vector pos, vector size, string text, float cursor) draw_text_input =
{
	sui_push_frame(pos - [6, 5], size);
	sui_fill([0, 0], size, [0, 0, 0], 1.0, 0);
	sui_border_box([0, 0], size, 2, [0.2, 0.2, 0.2], 0.3, 0);
	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_CENTER]);
	sui_text([6, 0], MENU_TEXT_SMALL, text, MENU_TEXT_1, 1, 0);
	float cursor_x = getTextWidth(substring(text, 0, cursor), MENU_TEXT_SMALL.x);
	if (sui_is_hovered(id))
		sui_text([6 + cursor_x, 0], MENU_TEXT_SMALL, "|", [1.0, 0.25, 0.25], 1, 0);
	sui_pop_frame();
};

//
// Menu_TextInput(id, order, text, cursor)
// Draws a Text Input box at the given order position
//
void(string id, float order, __inout string text, __inout float cursor) Menu_TextInput =
{

	order = Menu_PageOrder(order);
	if (!order) return;
	// Auf Touch gibt es keine Bildschirmtastatur -- ein Eingabefeld waere ein
	// Knopf, der nichts tut. Schlimmer noch: es lag ueber der ganzen Zeile und
	// verdeckte deren Beschriftung, der Text begann bei x=0 und wurde vom
	// Bildrand abgeschnitten. Auf Touch wird der Wert nur noch angezeigt; den
	// Decknamen setzt der Spieler in der Konto-Ansicht der Shell.
	if (MENU_TOUCH) {
		sui_text(Menu_ValuePos(order, text, MENU_VALUE_SIZE), MENU_VALUE_SIZE,
		         text, [0.80, 0.76, 0.70], 1, 0);
		return;
	}

	vector pos  = Menu_InputBox(order);
	vector size = [MENU_ROW_W, MENU_ROW_H];

	handle_text_input(id, pos, size, text, cursor);

	draw_text_input(id, pos, size, text, cursor);
};

//
// Menu_PasswordInput(id, order, text, cursor)
// Draws a Text Input box at the given order position (blocked out with asterisks)
//
void(string id, float order, __inout string text, __inout float cursor) Menu_PasswordInput =
{

	order = Menu_PageOrder(order);
	if (!order) return;
	if (MENU_TOUCH) {
		string punkte = "";
		for (int i = 0; i < strlen(text); i++) punkte = strcat(punkte, "*");
		sui_text(Menu_ValuePos(order, punkte, MENU_VALUE_SIZE), MENU_VALUE_SIZE,
		         punkte, [0.80, 0.76, 0.70], 1, 0);
		return;
	}

	vector pos  = Menu_InputBox(order);
	vector size = [MENU_ROW_W, MENU_ROW_H];
	string safe = "";

	for (int i = 0; i < strlen(text); i++)
		safe = sprintf("%s%s", safe, "*");

	handle_text_input(id, pos, size, text, cursor);

	draw_text_input(id, pos, size, safe, cursor);
};

static string(string s) str2ascii =
{
	for (int i = 0; i < strlen(s); i++)
	{
		if (s[i] < 32 || s[i] > 126)
			s[i] = 63; // question mark
	}
	return s;
};

//
// Menu_CleanUpServerAddress(server_address)
// Strips stuff from the CNAME like /udp/ etc.
// if it causes conflicts when trying to connect.
//
string Menu_CleanUpServerAddress(string server_address) =
{
	// Strip /udp/
	if (substring(server_address, 0, 5) == "/udp/") {
		return substring(server_address, 5, strlen(server_address) - 5);
	}

	return server_address;
};

//
// Menu_ServerList(id, pos, size, scrollofs, num_servers)
// Draw the master server list
//
void(float type) Menu_PlaySound;
void(string id, vector pos, vector size, __inout vector scrollofs, float num_servers) Menu_ServerList =
{
	vector rowsize = [size.x, 16];
	vector listitem_pos = [0, 0, 0];
	sui_fill(pos, size, [0, 0, 0], 0.75, 0);

	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_CENTER]);

	int server_display_x = 0;
	int map_display_x = 0;
	int player_display_x = 0;

	sui_list_view_begin(strcat(id, "scrl"), pos, size, rowsize, num_servers, scrollofs, [0, 16]);
	for (float index = sui_list_item(listitem_pos); index > -1; index = sui_list_item(listitem_pos))
	{
		sui_push_frame(listitem_pos, rowsize);

		string listitem_id = strcat(id, "scrl", ftos(index));
		sui_action_element([0, 0], rowsize, listitem_id, sui_noop);

		// bg
		vector bpos = [0, 0];
		vector bsize = [(rowsize.x / 8) * 5, rowsize.y];
		sui_fill(bpos, rowsize, [0.25, 0.1, 0.1], 0.5, 0);

		// hovered bg
		if (sui_is_hovered(listitem_id))
			sui_fill(bpos, rowsize, [0.25, 0.1, 0.1], 0.5, 0);

#ifdef MENU
		// do it
		if (sui_is_clicked(listitem_id)) {
			Menu_PlaySound(MENU_SND_ENTER);
			m_toggle(false);
			map_name_override = gethostcachestring(gethostcacheindexforkey("map"), index);
			
			string server_address = Menu_CleanUpServerAddress(gethostcachestring(gethostcacheindexforkey("cname"), index));
			localcmd("connect ", server_address, "\n");
		}
#endif // MENU

		// name
		server_display_x = bpos.x;
		sui_fill(bpos, bsize, [0.25, 0.1, 0.1], 0.5, 0);
		sui_text(bpos + [8, 2], MENU_TEXT_SMALL, str2ascii(gethostcachestring(gethostcacheindexforkey("name"), index)), MENU_TEXT_1, 1, 0);

		// map
		bsize.x = (rowsize.x / 8);
		bpos.x = bsize.x * 5;
		map_display_x = bpos.x;
		sui_text(bpos + [8, 2], MENU_TEXT_SMALL, gethostcachestring(gethostcacheindexforkey("map"), index), MENU_TEXT_1, 1, 0);

		// players
		bpos.x = bsize.x * 7;
		player_display_x = bpos.x;
		string s = sprintf("%d/%d",
			stof(gethostcachestring(gethostcacheindexforkey("numhumans"), index)),
			stof(gethostcachestring(gethostcacheindexforkey("maxplayers"), index))
		);
		sui_fill(bpos, bsize, [0.25, 0.1, 0.1], 0.5, 0);
		sui_text(bpos + [8, 2], MENU_TEXT_SMALL, s, MENU_TEXT_1, 1, 0);

		// hovered border
		bpos = [0, 0];
		if (sui_is_hovered(listitem_id))
			sui_border_box(bpos, rowsize, 1, [0.4, 0.4, 0], 1, 0);

		sui_pop_frame();
	}
	sui_list_view_end();

	// Table
	if (map_display_x == 0)
		return;
	
	sui_text([server_display_x, pos.y] + [8, -135], MENU_TEXT_SMALL, T("Server Name"), MENU_TEXT_1, 1, 0);
	sui_text([map_display_x, pos.y] + [8, -135], MENU_TEXT_SMALL, T("Map"), MENU_TEXT_1, 1, 0);
	sui_text([player_display_x, pos.y] + [8, -135], MENU_TEXT_SMALL, T("Players"), MENU_TEXT_1, 1, 0);
};

void() Menu_StartCoop =
{
	localcmd("sv_public 2; sv_listen_qw 1\n");
	current_menu = MENU_COOPSTOCK;
};

void() Menu_StartSolo =
{
	localcmd("sv_public 0; sv_listen_qw 0\n");
	current_menu = MENU_SOLO;
};

struct name_command {
	string name;
	string command;
};

name_command bindlist[] = 
{
	{ "Forward", "+forward" },
	{ "Back", "+back" },
	{ "Left", "+moveleft" },
	{ "Right", "+moveright" },
	{ "Jump", "+jump" }
};

void(string id, vector pos, vector size, string name, string command) bind_button =
{
	sui_push_frame(pos, size);
	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_CENTER]);
	string key = sui_binder(id, [0, 0], size, name, command);
	if (sui_is_hovered(id)) sui_fill([0, 0], size, MENU_HIGHLIGHT, 0.1, 0);
	sui_text([6, 0], MENU_TEXT_SMALL, name, MENU_TEXT_1, 1, 0);
	sui_set_align([SUI_ALIGN_END, SUI_ALIGN_CENTER]);
	sui_text([-6, 0], MENU_TEXT_SMALL, key, MENU_TEXT_1, 1, 0);
	
	sui_pop_frame();
};


void(string id, vector pos, vector size, __inout vector scrollofs) bind_list =
{
	sui_fill(pos, size, MENU_BG_DARK, 0.75, 0);
	sui_list_view_begin(strcat(id, "scrl"), pos, size, [size_x - 6, 24], bindlist.length, scrollofs, [0, 6]);
	vector listitem_pos = '0 0 0';
	for (float index = sui_list_item(listitem_pos); index > -1; index = sui_list_item(listitem_pos))
	{
		sui_push_frame(listitem_pos, [size_x - 6, 24]);
		bind_button(strcat(id, ftos(index)), [0, 0], [size_x - 6, 24], bindlist[index].name, bindlist[index].command);
		sui_pop_frame();
	}
	sui_list_view_end();	
};

vector binds_scroll;
void() settings_menu =
{
	vector pos = [0, 0];
	vector size = [360, 280];
	
	sui_push_frame(pos, size);

	sui_fill([0, 0], size, MENU_BG, 0.75, 0);
	sui_border_box([0, 0], size, 2, MENU_BORDER, 0.3, 0);
	
	sui_set_align([SUI_ALIGN_CENTER, SUI_ALIGN_START]);
	sui_text([0, 4], MENU_TEXT_MEDIUM, "Settings", MENU_TEXT_1, 1, 0);

	
	sui_set_align([SUI_ALIGN_START, SUI_ALIGN_START]);
	
	float xpos = 8;
	float ypos = 32;
	float width = size_x * 0.5 - 8 * 2;
	sui_text([xpos, ypos], MENU_TEXT_SMALL, "Controls", MENU_TEXT_1, 1, 0);
	ypos += 16;
	bind_list("bindlist", [xpos, ypos], [width, 160], binds_scroll);
	ypos += 160 + 8;

	cvar_slider([xpos, ypos], [width, 32], [0.1, 10], "sensitivity", "Sensitivity", "%.2f");
	ypos += 32;

	ypos = 32;
	xpos = 8 + width + 8 + 8;
	
	cvar_slider([xpos, ypos], [width, 32], [0, 1], "volume", "Volume", "%.2f");
	ypos += 32 + 4;
	cvar_slider([xpos, ypos], [width, 32], [0, 1], "musicvolume", "Music Volume", "%.2f");
	ypos += 32 + 4 + 8;
	
	sui_text([xpos, ypos], MENU_TEXT_SMALL, "Video", MENU_TEXT_1, 1, 0);
	ypos += 16;
	my_button("fs_btn", [xpos, ypos], [width, 20], "Fullscreen") ? localcmd("vid_fullscreen 2; vid_restart\n") : 0;
	ypos += 24;
	my_button("wn_btn", [xpos, ypos], [width, 20], "Windowed") ? localcmd("vid_fullscreen 0; vid_width 1024; vid_height 768; vid_restart\n") : 0;
	ypos += 24;
	sui_text([xpos, ypos], MENU_TEXT_SMALL, "Window can be resized.", MENU_TEXT_1, 0.8, 0);
	ypos += 16;
	sui_set_align([SUI_ALIGN_END, SUI_ALIGN_END]);
	my_button("stg_back", [-8, -8], [80, 20], "Back") ? current_menu = MENU_MAIN : 0;
	
	sui_pop_frame();
};

void(float type) Menu_PlaySound =
{
	string sound = "";

	if (type == MENU_SND_NAVIGATE) sound = cvar_string("menu_navigatesound");
	else if (type == MENU_SND_ENTER) sound = cvar_string("menu_entersound");
	else if (type == MENU_SND_BEEP) sound = cvar_string("menu_beepsound");

	localsound(sound, 0, cvar("nzp_uivolume"));
};

void() Menu_LeftArrowPressed =
{
	menu_leftarrow_pressed = TRUE;
};

void() Menu_RightArrowPressed =
{
	menu_rightarrow_pressed = TRUE;
};

float last_menu;
void(vector size) root_menu =
{
	// Genau EIN cvar()-Zugriff pro Frame statt einer je Knopf.
	Menu_Metrics_Update(size);

	sui_set_align([SUI_ALIGN_CENTER, SUI_ALIGN_CENTER]);
	sui_fill([0, 0], size, '0 0 0', 0.5, 0);
	switch (current_menu)
	{

#ifdef MENU

		case MENU_MAIN: Menu_Main(); break;
		case MENU_SOLO: menu_map_mode = MAP_SOLOSTOCK; Menu_Maps(); break;
		case MENU_SOLOUSER: menu_map_mode = MAP_SOLOUSER; Menu_Maps(); break;
		case MENU_COOP: Menu_Coop(); break;
		case MENU_COOPJOIN: Menu_Coop_Join(); break;
		case MENU_COOPBROWSE: Menu_Coop_Browse(); break;
		case MENU_COOPDIRECT: Menu_Coop_Direct(); break;
		case MENU_COOPCREATE: Menu_Coop_Create(); break;
		case MENU_COOPSTOCK: menu_map_mode = MAP_COOPSTOCK; Menu_Maps(); break;
		case MENU_COOPUSER: menu_map_mode = MAP_COOPUSER; Menu_Maps(); break;
		case MENU_CREDITS: Menu_Credits(); break;
		case MENU_LOBBY: Menu_Lobby(); break;
		case MENU_GAMESETTINGS: Menu_GameSettings(); break;
		case MENU_BIOS: Menu_Bios(); break;

#else

		case MENU_PAUSE: Menu_Pause(); break;

#endif // MENU

		case MENU_OPTIONS: Menu_Options(); break;
		case MENU_VIDEO: Menu_Video(); break;
		case MENU_AUDIO: Menu_Audio(); break;
		case MENU_CONTROL: Menu_Control(); break;
		case MENU_GAMEPAD: Menu_Gamepad(); break;
		case MENU_BINDINGS: Menu_Bindings(); break;
		case MENU_ACCESSIBILITY: Menu_Accessibility(); break;

		default: break;
	}

	menu_leftarrow_pressed = false;
	menu_rightarrow_pressed = false;

	// Menu enter sound
	if (last_menu != current_menu) {
		Menu_PlaySound(MENU_SND_ENTER);
		last_menu = current_menu;
		sui_reset_hover();
		menu_map_vorschau = "";   // Vorschau gilt nur innerhalb einer Kartenliste
		menu_page = 0;
		menu_wechsel_zeit = Menu_Uhr();
	}
};
