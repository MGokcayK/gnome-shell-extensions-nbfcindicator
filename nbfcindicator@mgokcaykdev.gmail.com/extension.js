/*
 * Copyright (C) 2020 Mehmet Gökçay Kabataş - mgokcayk <mgokcaykdev@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

 // imports 
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Slider = imports.ui.slider;
const GLib = imports.gi.GLib;
const Util = imports.misc.util;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const Nbfc_Indicator = new Lang.Class({
	Name: 'Nbfc_Indicator',	// Class Name
	Extends: PanelMenu.Button,	// Parent Class

	// Constructor
	_init: function() {
		this.parent(0, 'Nbfc_Indicator', false);

		let box = new St.BoxLayout(); // create box 
		
		// create icon
		var theme = imports.gi.Gtk.IconTheme.get_default();
		let icon_dir = Me.dir.get_child('icons');
		theme.append_search_path(icon_dir.get_path());
		icon = new St.Icon({ icon_name: 'nbfc-icon',
		                         style_class: 'system-status-icon'});

		// create label for panel
		toplabel = new St.Label({ text: ' Nbfc ', 
			y_expand: true,
			y_align: Clutter.ActorAlign.CENTER });

		box.add(icon); // add icon to box
		box.add(toplabel); // add label to box

		this.actor.add_child(box); // add box to panel 

		this.settings = Convenience.getSettings(); // get settings from schemas

		// creatings menu items
		serviceEnable = new PopupMenu.PopupSwitchMenuItem('Service Enable ');
		readOnly = new PopupMenu.PopupMenuItem('Read Only ',{reactive:false});
		selectedConfigName = new PopupMenu.PopupMenuItem('Selected Config ', { reactive: false });
		temperature = new PopupMenu.PopupMenuItem('Temperature ' , { reactive: false });
		fanName = new PopupMenu.PopupMenuItem('Fan Display Name ', { reactive: false });
		autoControl = new PopupMenu.PopupSwitchMenuItem('Auto Control ');
		critMode = new PopupMenu.PopupMenuItem('Critical Mode ', {reactive: false});
		fanSpeed = new PopupMenu.PopupMenuItem('Fan Speed ', { reactive: false });
		tarFanSpeed = new PopupMenu.PopupMenuItem('Fan Target Speed', { reactive: false });
		slider = new Slider.Slider(0.5);
		sliderContainer = new PopupMenu.PopupBaseMenuItem();
		sliderContainer.actor = slider.actor;

		//debuggerG = new PopupMenu.PopupMenuItem('Debugger ', { reactive: false }); 
		
		// add menu items to menu
		this.menu.addMenuItem(serviceEnable);
		this.menu.addMenuItem(readOnly);
		this.menu.addMenuItem(selectedConfigName);
		this.menu.addMenuItem(temperature);
		this.menu.addMenuItem(autoControl);
		this.menu.addMenuItem(fanName);
		this.menu.addMenuItem(critMode);
		this.menu.addMenuItem(fanSpeed);
		this.menu.addMenuItem(tarFanSpeed);
		this.menu.addMenuItem(sliderContainer);
		//this.menu.addMenuItem(debuggerG);

		// adding settings
		this._addSettings();

		location = this.settings.get_string('location');

		// handle switch and slider events with connect
		serviceEnable.connect('toggled', Lang.bind(this, function(object, value){
			if (value)
			{
				GLib.spawn_command_line_sync('mono '+ location +'/nbfc.exe start -e');
				this._updateDisplay();
			}else
			{
				GLib.spawn_command_line_sync('mono '+ location +'/nbfc.exe stop');
				this._updateDisplay();
			}
		}));

		autoControl.connect('toggled', Lang.bind(this, function(object, value){
			if (value)
			{
				GLib.spawn_command_line_sync('mono '+ location +'/nbfc.exe set -a');
				this._updateDisplay();
			}else
			{
				let cmd = 'mono '+ location +'/nbfc.exe set -s' + String(fanSpeedValue);
				GLib.spawn_command_line_sync(cmd);
				this._updateDisplay();
			}
		}));

		slider.connect('drag-end', (_slider) => this._onSliderValueChanged(_slider));

		// create connection refuse counter
		connectionRefusedCounter = 0;

		// create update time previouse variable to check it is changed or not/
		updateTimePre = this.settings.get_int('update-time');

		//update display
		this._updateDisplay();

		// adding timer
		this._addTimer();		
 	 },


	_updateDisplay : function()
	{	
		// check whether update timer changed from settings or not 
		if (updateTimePre != this.settings.get_int('update-time'))
		{
			updateTimePre = this.settings.get_int('update-time');
			this._updateTimeChanged();
		}

		location = this.settings.get_string('location');
		//debuggerG.label.text = location;
		
		// run command line to get program output
		commandLineOutput = GLib.spawn_command_line_sync('mono '+ location +'/nbfc.exe status -a').toString();
		var checker = commandLineOutput.split(",");
		var line = commandLineOutput.split("\n");

		// check whether connection refused or not from command line output
		if (checker[2].length < 20 && checker[2].length > 10)
		{
			connectionRefused = new PopupMenu.PopupMenuItem("Connection Refused..", {reactive:false});
			
			var connectMessage = new PopupMenu.PopupMenuItem("Run : systemctl enable nbfc --now",{reactive:false});
			
			// if connection refused add some menu items to warn user.
			if (connectionRefusedCounter < 1)
			{
				sep = new PopupMenu.PopupSeparatorMenuItem();
				this.menu.addMenuItem(sep);
				this.menu.addMenuItem(connectionRefused);
				this.menu.addMenuItem(connectMessage);
				fanSpeed.label.text = "Fan Speed : undefined";
				tarFanSpeed.label.text ="Fan Target Speed : undefined ";
				slider.value = 0.0;
				connectionRefusedCounter += 1;
				this._updateDisplay();
			}			
			return;
		}else
		{
			// if program become enable from connection refuse conditon, change some properties.
			if (connectionRefusedCounter == 1)
			{
				connectionRefusedCounter = 0;
				this._updateDisplay(); 
			}else // if program not in connection refused but there are some menu children, remove it.
			{
				let children = this.menu._getMenuItems();
				if (children.length > 11)
				{
					for(let i=children.length; i>11; i--)
					{
						children[children.length-1].destroy();
					}				
					this._updateDisplay();
				}			
			}
		}		
		
		// service status value and change switch w.r.t output
		var valServStat = line[0].split(": ")[1];
		if (valServStat == "True")
		{
			serviceEnable.setToggleState(1);
		}else
		{
			serviceEnable.setToggleState(0);
			slider.setValue(0.0);
			toplabel.text = 'Nbfc - Service Disable';
		}

		/* READ ONLY PROPERTIES NOT WORK IN TERMINAL SO DISABLED. JUST ADDED TEXT
		var valReadOnly = line[1].split(": ")[1];
		
		readOnly.connect('toggle',Lang.bind(this, function(object, value)
		{	
			GLib.spawn_command_line_sync('mono '+ location +'/nbfc.exe stop');
			if (value) 
			{
				
				GLib.spawn_command_line_sync('mono '+ location +'/nbfc.exe start -r');
				this._updateDisplay();
			}else 
			{
				GLib.spawn_command_line_sync('mono '+ location +'/nbfc.exe start -e');
				this._updateDisplay();
			}
		}));
		if (valReadOnly == "True")
		{
			readOnly.setToggleState(1);
		}else
		{
			readOnly.setToggleState(0);
		}
		*/
		readOnly.label.text = 'Read Only : not work proper in terminal';

		// check config file names from setting page. if different apply config, else do nothing.
		strCnfg = String(line[2].split(": ")[1]);
		schemaCnfg = this.settings.get_string('configs').split(".")[0];
		if (strCnfg != schemaCnfg)
		{
			cmd = 'mono ' + this.settings.get_string('location') + "/nbfc.exe config --apply '" + schemaCnfg + "'";
			GLib.spawn_command_line_sync(cmd);
			txtCnfg = schemaCnfg;
		}else 
		{
			txtCnfg = strCnfg;
		}

		// edit menu items 
		var txtSelConFile = "Selected Config File : " + txtCnfg ;
		selectedConfigName.label.text = txtSelConFile;

		var txtTemp = "Temperature : " + String(line[3].split(": ")[1]);
		temperature.label.text = txtTemp;

		var txtFanName = "Fan Display Name : " + String(line[5].split(": ")[1]);
		fanName.label.text = txtFanName;

		var valAutoControl = line[6].split(": ")[1];
		if (valAutoControl == "True")
		{
			autoControl.setToggleState(1);
		}else
		{
			autoControl.setToggleState(0);
		}

		// if service is enable, get fan status.		
		if(line[7])
		{
			var valCritMode = line[7].split(": ")[1];
			if (valCritMode == "True")
			{
				critMode.label.text = 'Critic Mode : True. Cannot change by user.';
			}else
			{
				critMode.label.text = "Critic Mode : False. Cannot change by user.";
			}

			fanSpeedValue = line[8].split(": ")[1];
			var txtFanSpeed = "Fan Speed : " + String(fanSpeedValue) ;
			fanSpeed.label.text = txtFanSpeed;
			toplabel.text = "FS: "+txtFanSpeed.split(":")[1];
					
			var txtTarFanSpeed = "Fan Target Speed : " + String(line[9].split(": ")[1]) ;
			tarFanSpeed.label.text = txtTarFanSpeed;

			slider.setValue(fanSpeedValue / 100);
		}

		//debuggerG.label.text = String(this.settings.get_string('configs'));

	},

	// run command w.r.t slider value.		
	_onSliderValueChanged(_slider) {
		if (autoControl.state == 0)
		{
			let cmd = 'mono '+ location +'/nbfc.exe set -s' + String(slider.value * 100);
			GLib.spawn_command_line_sync(cmd);
			this._updateDisplay();
		}
	},

	// update time when it is changed.
	_updateTimeChanged : function(){
        Mainloop.source_remove(this._timeoutId);
        this._addTimer();
    },

	// adding timer
	_addTimer : function(){
        this._timeoutId = Mainloop.timeout_add_seconds(this.settings.get_int('update-time'), Lang.bind(this, function (){
            this._updateDisplay();
            return true;
        }));
	},
	
	_addSettings : function(){
        // add separator
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

		// create settings
        let settings = new PopupMenu.PopupBaseMenuItem();
        settings.actor.add(new St.Label({ text: 'Settings' }), { expand: true, x_fill: false });

		// handle signals
        settings.connect('activate', function () {
            Util.spawn(["gnome-shell-extension-prefs", Me.metadata.uuid]);
        });

		// add settings
        this.menu.addMenuItem(settings);
    },

	// destroy the class  
	destroy: function() {
		Mainloop.source_remove(this._timeoutId);
		this.parent();
	}
});


// Global variables for use as button to click 
let button;

// initialize function
function init() {}

// main function
function enable() {
	// create button
	button = new Nbfc_Indicator;

	// add button to panel
	Main.panel.addToStatusArea('PopupMenuExample', button, 0, 'right');
}

// destructor of main function
function disable() {
	button.destroy();	
}
