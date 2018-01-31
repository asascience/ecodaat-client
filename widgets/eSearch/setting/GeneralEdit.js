///////////////////////////////////////////////////////////////////////////
// Robert Scheitlin WAB eSearch Widget
///////////////////////////////////////////////////////////////////////////
/*global define, console, window*/
define(
  ["dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/on",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "jimu/BaseWidgetSetting",
    "jimu/dijit/Message",
    "dojo/text!./GeneralEdit.html",
    "jimu/dijit/CheckBox",
    "dijit/form/FilteringSelect",
    "dijit/form/ValidationTextBox"
  ],
  function(
    declare,
    lang,
    array,
    on,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    BaseWidgetSetting,
    Message,
    template) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: "general-options-edit",
      templateString: template,
      _generaloption: null,
      config:null,
      dnls:null,
      formatString: null,

      postMixInProperties:function(){
        this.dnls = window.jimuNls.drawBox;
      },

      postCreate: function() {
        this.inherited(arguments);
        this._bindEvents();
        this.dateFormat.set('disabled', true);
        this._setConfig(this.config);
      },

      startup: function() {
        this.inherited(arguments);
      },

      _setConfig: function(config) {
        this.config = config;
        if(!this.config){
          return;
        }
//        console.info(this.config);
        var isAutoZoom = (this.config.hasOwnProperty('autozoomtoresults') && !this.config.autozoomtoresults)? false : true;
        this.autoZoomCbx.setValue(isAutoZoom);
        this.mouseOverGraphicsCbx.setValue(this.config.mouseovergraphics || false);
        this.enablePopupsCbx.setValue(this.config.enablePopupsOnResultClick);
        this.disablePopupsCbx.setValue(this.config.disablePopups);
        this.disableUVCacheCbx.setValue(this.config.disableuvcache);
        this.limit2MapExtCbx.setValue(this.config.limitsearch2mapextentchecked);
        this.exportSearchURLCbx.setValue(this.config.exportsearchurlchecked);
        this.zoomFactor.setValue(this.config.zoomFactor);
        this.containsWordCbx.setValue(this.config.containsword || false);
        if(this.config.initialView){
          this.selectInitialView.set('value', this.config.initialView);
        }
        if(this.config.selectfilter){
          this.selectFilter.set('value', this.config.selectfilter);
        }else{
          this.selectFilter.set('value', 'contains');
        }

        if (this.config.datedisplayformat){
          this.formatString = this.config.datedisplayformat;
          var store = this.selectDateFormat.store;
          store.fetch({
            query: {name: '*'},
            onComplete: lang.hitch(this, function(items){
              if (array.some(items, lang.hitch(this, function (item){
                return item.value === this.formatString;
              }))){
                this.selectDateFormat.set('value', this.formatString);
              } else {
                this.selectDateFormat.set('value', this.nls.custom);
                this.dateFormat.set('value', this.formatString);
              }
            })
          });
        } else {
          this.selectDateFormat.set('value', 'd MMM yyyy');
          this.dateFormat.set('value', 'd MMM yyyy');
        }
      },

      getConfig: function() {
        var generalOps = {};
        generalOps.initialView = this.selectInitialView.get('value');
        generalOps.selectfilter = this.selectFilter.get('value');
        generalOps.enablePopupsOnResultClick = this.enablePopupsCbx.getValue();
        generalOps.disablePopups = this.disablePopupsCbx.getValue();
        generalOps.disableuvcache = this.disableUVCacheCbx.getValue();
        generalOps.exportsearchurlchecked = this.exportSearchURLCbx.getValue();
        generalOps.limitsearch2mapextentchecked = this.limit2MapExtCbx.getValue();
        generalOps.autozoomtoresults = this.autoZoomCbx.getValue();
        generalOps.mouseovergraphics = this.mouseOverGraphicsCbx.getValue();
        if(this.selectDateFormat.get('value') === this.nls.custom){
          generalOps.datedisplayformat = this.dateFormat.get("value");
        }else{
          generalOps.datedisplayformat = this.selectDateFormat.get('value');
        }
        generalOps.zoomFactor = this.zoomFactor.getValue();
        generalOps.containsword = this.containsWordCbx.getValue();
        return generalOps;
      },

      _need2ChkPopups: function() {
        if(this.disablePopupsCbx.getValue()){
          this.enablePopupsCbx.setValue(false);
          this.mouseOverGraphicsCbx.setValue(false);
          this.enablePopupsCbx.setStatus(false);
          this.mouseOverGraphicsCbx.setStatus(false);
        }else{
          this.enablePopupsCbx.setStatus(true);
          this.mouseOverGraphicsCbx.setStatus(true);
        }
      },

      _onSelectDateFormatChange: function(){
        if(this.selectDateFormat.get('value') === this.nls.custom){
          this.dateFormat.set('value', this.formatString || this.nls.friendlyDatePattern);
          this.dateFormat.set('disabled', false);
        } else {
          this.dateFormat.set('value', this.selectDateFormat.get('value'));
          if (!this.dateFormat.disabled){
            this.dateFormat.set('disabled', true);
          }
        }
      },

      _bindEvents:function(){
        this.disablePopupsCbx.onChange = lang.hitch(this, this._need2ChkPopups);
        this.own(on(this.selectDateFormat, 'change', lang.hitch(this, '_onSelectDateFormatChange')));
      }
    });
  });
