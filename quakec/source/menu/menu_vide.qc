string menu_video_buttons[12] = {"vm_resol", "vm_fulls", "vm_shfps", "vm_maxps", "vm_vsync", "vm_fov", "vm_gamma", "vm_uwide", "vm_parts", "vm_filtr", "vm_apply", "vm_back"};

float menu_video_init;
float menu_video_modes;

float current_selected_vidmode;
float current_fullscreen;
float current_showfps;
float current_vsync;
float current_ultrawide;
float current_particles;
float current_filter;

#define MAX_VIDEO_MODES     128 // FIXME: arbitrary.

var struct
{
    vector  size;
    vector  ratio;
} video_modes[MAX_VIDEO_MODES]; 

float(float a, float b) Menu_Video_GCD =
{
    if (b == 0)
        return a;
    else
        return Menu_Video_GCD(b, a % b);
};

vector(vector resolution) Menu_Video_CalculateAspectRatio =
{
    vector ratio;

    if (resolution_x == resolution_y) {
        ratio_x = 1;
        ratio_y = 1;
        return ratio;
    }

    float tempf = 0;
    float width = resolution_x;
    float height = resolution_y;

    if (width < height) {
        tempf = width;
        width = height;
        height = tempf;
    }

    float divisor = Menu_Video_GCD(width, height);

    if (!tempf) {
        ratio_x = rint(width / divisor);
        ratio_y = rint(height / divisor);
    } else {
        ratio_x = rint(height / divisor);
        ratio_y = rint(width / divisor);
    }

    return ratio;
};

void() Menu_Video_PrepareVideoModes =
{
	for (float i = 0; i < MAX_VIDEO_MODES; i++)
	{
		vector driver_query = getresolution(i);

		if (!driver_query_x || !driver_query_y)
			break;

        video_modes[i].size = driver_query;
        video_modes[i].ratio = Menu_Video_CalculateAspectRatio(driver_query);

        menu_video_modes = i;
	}
};

void() Menu_Video_StoreCurrentSettings =
{
    current_fullscreen = cvar("vid_fullscreen");
    current_showfps = cvar("show_fps");
    current_vsync = cvar("vid_vsync");
    current_ultrawide = cvar("vid_ultrawide_limiter");
    current_particles = cvar("nzp_particles");
    current_filter = (substring(strtoupper(cvar_string("gl_texturemode")), 0, 10) == "GL_NEAREST");
}

void() Menu_Video_Init =
{
    Menu_Video_PrepareVideoModes();
    Menu_Video_StoreCurrentSettings();
    menu_video_init = true;
};

void() Menu_Video_UpdateParticles =
{
    Menu_PlaySound(MENU_SND_ENTER);
    current_particles = !current_particles;
    cvar_set("nzp_particles", ftos(current_particles));
};

void() Menu_Video_UpdateUltrawide =
{
    Menu_PlaySound(MENU_SND_ENTER);
    current_ultrawide = !current_ultrawide;
    cvar_set("vid_ultrawide_limiter", ftos(current_ultrawide));
};

void() Menu_Video_UpdateVideoMode =
{
    Menu_PlaySound(MENU_SND_ENTER);
    current_selected_vidmode++;
};

void() Menu_Video_ApplySettings =
{
    Menu_PlaySound(MENU_SND_ENTER);
    localcmd(sprintf("vid_width %d\nvid_height %d\nvid_fullscreen %d\nvid_restart\nsaveconfig user_settings.cfg\n", 
    video_modes[current_selected_vidmode].size[0], video_modes[current_selected_vidmode].size[1],
    current_fullscreen));
    music_duration_time = 0;
};

void() Menu_Video_UpdateFullscreen =
{
    Menu_PlaySound(MENU_SND_ENTER);
    current_fullscreen++;
    if (current_fullscreen > 2) current_fullscreen = 0;
};

void() Menu_Video_UpdateShowFPS =
{
    Menu_PlaySound(MENU_SND_ENTER);
    current_showfps++;
    if (current_showfps > 2) current_showfps = 0;
    localcmd(sprintf("show_fps %d\n", current_showfps));
};

void() Menu_Video_UpdateVsync =
{
    Menu_PlaySound(MENU_SND_ENTER);
    current_vsync = !current_vsync;
    cvar_set("vid_vsync", ftos(current_vsync));
};

void() Menu_Video_UpdateFiltering =
{
    Menu_PlaySound(MENU_SND_ENTER);
    float is_filter = (substring(strtoupper(cvar_string("gl_texturemode")), 0, 10) == "GL_NEAREST");
    if (is_filter) {
        cvar_set("gl_texturemode", "GL_LINEAR_MIPMAP_LINEAR");
        current_filter = 0;
    } else {
        cvar_set("gl_texturemode", "GL_NEAREST_MIPMAP_LINEAR");
        current_filter = 1;
    }
};

string(string prev_id) Menu_Video_GetNextButton =
{
    if (prev_id == "")
        return menu_video_buttons[0];

    string ret = menu_video_buttons[0];

    for(float i = 0; i < menu_video_buttons.length; i++) {
        if (menu_video_buttons[i] == prev_id) {
            if (i + 1 >= menu_video_buttons.length)
                break;

            ret = menu_video_buttons[i + 1];
            break;
        }
    }

    if (cvar("vid_vsync") && ret == "vm_maxps")
        ret = "vm_vsync";

    return ret;
};

string(string next_id) Menu_Video_GetPreviousButton =
{
    if (next_id == "")
        return menu_video_buttons[menu_video_buttons.length - 1];

    string ret = menu_video_buttons[menu_video_buttons.length - 1];

    for(float i = menu_video_buttons.length - 1; i > 0; i--) {
        if (menu_video_buttons[i] == next_id) {
            if (i - 1 < 0)
                break;

            ret = menu_video_buttons[i - 1];
            break;
        }
    }

    if (cvar("vid_vsync") && ret == "vm_maxps")
        ret = "vm_shfps";

    return ret;
};

void() Menu_Video =
{
    if (!menu_video_init)
        Menu_Video_Init();
    
    Menu_DrawBackground();
    Menu_DrawTitle(T("VIDEO OPTIONS"));

    Menu_DrawMapPanel();

    // Resolution
    Menu_Button(1, "vm_resol", T("RESOLUTION"), T("Window size adjustment.")) ? Menu_Video_UpdateVideoMode() : 0;
    if (current_selected_vidmode > menu_video_modes) current_selected_vidmode = 0;
    string resolution_string = sprintf("%dx%d (%d:%d)", video_modes[current_selected_vidmode].size[0], 
    video_modes[current_selected_vidmode].size[1], video_modes[current_selected_vidmode].ratio[0], 
    video_modes[current_selected_vidmode].ratio[1]);
    Menu_DrawOptionValue(1, resolution_string);

    // Fullscreen
    Menu_Button(2, "vm_fulls", T("FULLSCREEN"), T("Change Fullscreen Mode.")) ? Menu_Video_UpdateFullscreen() : 0;
    string fullscreen_string = "";
    switch(current_fullscreen) {
        case 0: fullscreen_string = T("DISABLED"); break;
        case 1: fullscreen_string = T("ENABLED"); break;
        case 2: fullscreen_string = T("BORDERLESS"); break;
        default: break;
    }
    Menu_DrawOptionValue(2, fullscreen_string);

    // Show FPS
    Menu_Button(3, "vm_shfps", T("SHOW FPS"), T("Toggles display of FPS Values.")) ? Menu_Video_UpdateShowFPS() : 0;
    string showfps_string = "";
    switch(current_showfps) {
        case 0: showfps_string = T("DISABLED"); break;
        case 1: showfps_string = T("ENABLED"); break;
        case 2: showfps_string = T("VERBOSE"); break;
        default: break;
    }
    Menu_DrawOptionValue(3, showfps_string);

    // Max FPS
    if (cvar("vid_vsync") == 0) {
        Menu_Button(4, "vm_maxps", T("MAX FPS"), T("Configure Maximum FPS Value.")) ? 0 : 0;
        Menu_CvarSlider(4, "vm_maxps", [10, 500, 490], "cl_maxfps", true, false, false);
    } else {
        Menu_GreyButton(4, T("[VSYNC ON] MAX FPS"));
    }

    // VSync
    Menu_Button(5, "vm_vsync", T("VSYNC"), T("Sync Framerate with Display.")) ? Menu_Video_UpdateVsync() : 0;
    string vsync_string = "";
    if (current_vsync) vsync_string = T("ENABLED");
    else vsync_string = T("DISABLED");
    Menu_DrawOptionValue(5, vsync_string);

    // Field of View
    Menu_Button(6, "vm_fov", T("FIELD OF VIEW"), T("Change Camera Field of View.")) ? 0 : 0;
    Menu_CvarSlider(6, "vm_fov", [10, 150, 140], "fov", true, false, false);

    // Gamma
    Menu_Button(7, "vm_gamma", T("GAMMA"), T("Adjust game Black Level.")) ? 0 : 0;
    Menu_CvarSlider(7, "vm_gamma", [0.3, 2, 17], "gamma", false, true, false);

    // Ultrawide Mode
    Menu_Button(8, "vm_uwide", T("ULTRAWIDE MODE"), T("Condenses HUD closer to center of Display.")) ? Menu_Video_UpdateUltrawide() : 0;
    string wide_string = "";
    if (current_ultrawide) wide_string = T("ENABLED");
    else wide_string = T("DISABLED");
    Menu_DrawOptionValue(8, wide_string);

    // Particles
    Menu_Button(9, "vm_parts", T("PARTICLES"), T("Toggle Particle Effects for Performance.")) ? Menu_Video_UpdateParticles() : 0;
    string part_string = "";
    if (current_particles) part_string = T("ENABLED");
    else part_string = T("DISABLED");
    Menu_DrawOptionValue(9, part_string);

    // Texture Filtering
    Menu_Button(10, "vm_filtr", T("TEXTURE FILTERING"), T("Choose 3D Environment Filtering Mode.")) ? Menu_Video_UpdateFiltering() : 0;
    string filt_string = "";
    if (current_filter) filt_string = T("NEAREST");
    else filt_string = T("LINEAR");
    Menu_DrawOptionValue(10, filt_string);

    Menu_DrawDivider(11.5);
    Menu_Button(-2, "vm_apply", T("APPLY"), T("Save & Apply Settings.")) ? Menu_Video_ApplySettings() : 0;
    Menu_Button(-1, "vm_back", T("BACK"), T("Return to Configuration Menu.")) ? current_menu = MENU_OPTIONS : 0;

	sui_pop_frame();	
};