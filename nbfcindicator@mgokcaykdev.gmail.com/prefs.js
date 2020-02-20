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
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const GLib = imports.gi.GLib;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

const NbfcPrefsWidget = new GObject.Class({
    Name: 'Nbfc.Prefs.Widget',
    GTypeName: 'NbfcPrefsWidget',
    Extends: Gtk.Grid,

    _init: function(params) {
        this.parent(params);
        this.margin = this.row_spacing = this.column_spacing = 20;

        this.settings = Convenience.getSettings(); // get settings files from schemas 

        this._addSpinButton({label : 'Update Time (sec) : ', x: 0, y: 0}); // add spin button

        this._getConfigList(); 

        this._addEntry({label: "Config location (current : " + this.settings.get_string('location') + ") :", x : 0, y : 1, key: 'location'}); // add entry for location
        
        this.status = this._addLabel({label : '', x:0, y: 3}); // add status 

        this._addComboBox({label: " Config : " + this.settings.get_string('configs'), x :0, y : 2}); // add combobox for config
 
        
        
    },

    _getConfigList : function() 
    {
        items = ["..."]; // items in location file
        
        cmd = "ls " +this.settings.get_string('location'); // command for listing files in 'location' file.

        let fileExist = GLib.file_test(this.settings.get_string('location'),GLib.FileTest.IS_DIR); // check there is file named as 'location'.
        if (!fileExist)
        {
            cmd = "ls"; // make base file as /home/USER.
            this.status.label = 'Error : Location not found. '
        }   
        if(GLib.spawn_command_line_sync(cmd)[0]) // check command has not error.
        {
            configs = GLib.spawn_command_line_sync(cmd)[1].toString(); // apply cmd 
        }else
        {
            this.status.label = 'Error : ' + cmd + ' input has error.';
        }
        
        configs = configs.split("\n"); // split configs data w.r.t lines

        for (let it =0; it<configs.length; it++)
            if(configs[it].split(".")[1] == 'xml')
            {
                items.push(configs[it]); // add configs name to items 
            }
            

        //this.settings.set_string('configs', configs[0]); // change 'configs' in schemas as first item of items.

        if(this._comboBoxText)
        {
            this._editComboBox(); // if there is combobox created, edit it.
        }        

    },

    _editComboBox : function()
    {
        this._comboBoxText.remove_all(); // remove all items in combobox
        
        for (let i = 0; i < items.length; i++) 
            this._comboBoxText.append_text (items[i]); // add all items in items.
    },

    _addLabel : function(params)
    {
        let lbl = new Gtk.Label({label:params.label, halign : Gtk.Align.START});
        this.attach(lbl, params.x, params.y, 1, 1);
        return lbl;
    },

    _addSpinButton : function(params)
    {
        this._addLabel({label : params.label, x : params.x, y: params.y});
        let updateTime = Gtk.SpinButton.new_with_range (1, 60, 1);
        this.attach(updateTime, params.x + 1, params.y, 1, 1);
        this.settings.bind('update-time', updateTime, 'value', Gio.SettingsBindFlags.DEFAULT);
    },

    _addEntry : function(params)
    {
        let lbl = this._addLabel(params);
        let entry = new Gtk.Entry({halign : Gtk.Align.START, valign : Gtk.Align.CENTER})
        this.attach(entry, params.x + 1, params.y, 1, 1);
        entry.connect('activate',Lang.bind(this, function() {
            this.settings.set_string(params.key, entry.get_text())
            let cloc = "Location (current : " + entry.get_text() + ") :";
            lbl.label = cloc;
            this._getConfigList();
        }));
    },

    _addComboBox : function(params)
    {
        let lbl = this._addLabel(params);
        this._comboBoxText = new Gtk.ComboBoxText(); // create combobox

        this._editComboBox(); 

        this._comboBoxText.set_active (0); // active element is 0
        this.attach(this._comboBoxText,params.x + 1,params.y,1,1);

        // if combobox changed, get current item and edit to schema

        this._comboBoxText.connect('changed', Lang.bind(this, function(){            
            let active = this._comboBoxText.get_active();
            this.settings.set_string('configs', String(configs[active-1]));
            lbl.label = " Config : " + this.settings.get_string('configs');
        }));
    },

    _addSwitch : function(params)
    {
        let lbl = new Gtk.Label({label: params.label,halign : Gtk.Align.END});
        this.attach(lbl, params.x, params.y, 1, 1);
        let sw = new Gtk.Switch({halign : Gtk.Align.END, valign : Gtk.Align.CENTER});
        this.attach(sw, params.x + 1, params.y, 1, 1);
        if(params.help){
            lbl.set_tooltip_text(params.help);
            sw.set_tooltip_text(params.help);
        }
        this.settings.bind(params.key, sw, 'active', Gio.SettingsBindFlags.DEFAULT);
    },

});

function init() {
    Convenience.initTranslations();
}

function buildPrefsWidget() {
    let widget = new NbfcPrefsWidget();
    widget.show_all();
    return widget;
}
