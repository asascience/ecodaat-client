///////////////////////////////////////////////////////////////////////////
// Robert Scheitlin WAB eSearch Widget
///////////////////////////////////////////////////////////////////////////
/*global define, dojo, console, window, setTimeout, jimuConfig*/
define([
    'dojo/_base/declare',
    'dijit/_WidgetsInTemplateMixin',
    'jimu/BaseWidget',
    'jimu/dijit/TabContainer',
    './List',
    './Parameters',
    './RelateChooser',
    'jimu/dijit/Message',
    'jimu/utils',
    'esri/urlUtils',
    'esri/tasks/query',
    "esri/tasks/Geoprocessor",
    'esri/tasks/QueryTask',
    'esri/tasks/RelationshipQuery',
    'esri/layers/CodedValueDomain',
    'esri/layers/Domain',
    'esri/layers/GraphicsLayer',
    'esri/layers/FeatureLayer',
    'esri/layers/FeatureType',
    'esri/layers/Field',
    'esri/layers/RangeDomain',
    'esri/tasks/BufferParameters',
    'esri/tasks/GeometryService',
    'esri/config',
    'esri/graphic',
    'esri/graphicsUtils',
    'esri/geometry/Point',
    'esri/symbols/SimpleMarkerSymbol',
    'esri/symbols/PictureMarkerSymbol',
    'esri/geometry/Polyline',
    'esri/symbols/SimpleLineSymbol',
    'esri/geometry/Polygon',
    'esri/geometry/Multipoint',
    'esri/geometry/Extent',
    'esri/symbols/SimpleFillSymbol',
    'esri/symbols/jsonUtils',
    'esri/renderers/SimpleRenderer',
    'esri/renderers/jsonUtils',
    'esri/toolbars/draw',
    'esri/dijit/PopupTemplate',
    'esri/request',
    'esri/Color',
    'dojo/Deferred',
    'dijit/ProgressBar',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/_base/html',
    'dojo/_base/array',
    'dojo/promise/all',
    'dojo/date',
    'dojo/date/locale',
    'dijit/form/Select',
    'dijit/form/TextBox',
    'dijit/form/NumberTextBox',
    'jimu/dijit/DrawBox',
    'jimu/dijit/LoadingShelter',
    'dojo/io-query',
    'dojo/query',
    'esri/SpatialReference',
    'jimu/WidgetManager',
    'jimu/PanelManager',
    'dojo/aspect',
    'esri/domUtils',
    'jimu/LayerInfos/LayerInfos',
    'jimu/CSVUtils',
    'jimu/BaseFeatureAction',
    'jimu/FeatureActionManager',
    'jimu/dijit/FeatureActionPopupMenu',
    'esri/tasks/FeatureSet',
    'dojo/dom-construct',
    'dojo/dom-class',
    'dojo/topic',
    'dojox/form/CheckedMultiSelect',
    'jimu/dijit/CheckBox',
    'dijit/form/DropDownButton',
    "dijit/form/NumberSpinner",
    'dijit/Menu',
    'dijit/MenuItem'
  ],
  function (
    declare, _WidgetsInTemplateMixin, BaseWidget, TabContainer, List, Parameters, RelateChooser, Message, jimuUtils, urlUtils, Query, Geoprocessor,QueryTask,
    RelationshipQuery, CodedValueDomain, Domain, GraphicsLayer, FeatureLayer, FeatureType, Field, RangeDomain, BufferParameters, GeometryService,
    esriConfig, Graphic, graphicsUtils, Point, SimpleMarkerSymbol, PictureMarkerSymbol, Polyline, SimpleLineSymbol, Polygon, Multipoint, Extent,
    SimpleFillSymbol, symUtils, SimpleRenderer, jsonUtil, Draw, PopupTemplate, esriRequest, Color, Deferred, ProgressBar, lang, on, html, array,
    all, date, locale, Select, TextBox, NumberTextBox, DrawBox, LoadingShelter, ioquery, dojoQuery, SpatialReference, WidgetManager,
    PanelManager, aspect, domUtils, LayerInfos, CSVUtils, BaseFeatureAction, FeatureActionManager, PopupMenu, FeatureSet, domConstruct, domClass, topic,CheckedMultiSelect
  ) { /*jshint unused: true*/
    return declare([BaseWidget, _WidgetsInTemplateMixin], {
      name: 'Search',
      label:'Advanced Search',
      baseClass: 'widget-esearch',
      resultLayers: [],
      operationalLayers: [],
      relateLayers:[],
      graphicLayerIndex: 0,
      AttributeLayerIndex: 0,
      spatialLayerIndex: 0,
      expressIndex: 0,
      progressBar: null,
      tabContainer: null,
      SAMPLETYPE: 'BOB',
      list: null,
      selTab: null,
      garr: [],
      pointSearchTolerance: 6,
      polygonsToDiscard: [],
      autozoomtoresults: false,
      layerautozoomtoresults: false,
      keepgraphicalsearchenabled: false,
      layerDomainsCache: {},
      layerUniqueCache: null,
      graphicsLayerBuffer: null,
      bufferWKID: null,
      initiator: null,
      currentLayerIndex: null,
      lastWhere: null,
      wManager: null,
      pManager: null,
      attTableOpenedbySearch: true,
      oidArray: null,
      disabledTabs: null,
      shapeTab: true,
      attribTab: true,
      spatTab: true,
      rsltsTab: true,
      fieldTab: true,
      mouseovergraphics: false,
      lastDrawCommonType: null,
      lastDrawTool: null,
      zoomAttempt: 0,
      tempResultLayer: null,
      currentSearchLayer: null,
      currentFeatures: null,
      eLocateGLFound: false,
      locateGraphicsLayer: null,
      mapLayerAddResultEvent: null,
      eLocateEnabled: true,
      gSelectTypeVal: 'new',
      aSelectTypeVal: 'new',
      serviceFailureNames: [],
      resultFormatString: "",
      operLayerInfos: null,
      sumResultArr: [],
      sumFields: [],
      currentCSVResults: null,
      popupMenu: null,
      autoactivatedtool: null,

      postCreate: function () {
        this.inherited(arguments);
        this.list = new List({}, this.listDiv);
        this.list.startup();
        this.own(on(this.list, "click", lang.hitch(this, this._selectResultItem)));
        html.addClass(this.list.domNode, "esearch-list");
        this.popupMenu = PopupMenu.getInstance();
        this.featureActionManager = FeatureActionManager.getInstance();
        if(this.config.graphicalsearchoptions.autoactivatedtool){
          this.autoactivatedtool = this.config.graphicalsearchoptions.autoactivatedtool;
        }
        if (this.map.itemId) {
          LayerInfos.getInstance(this.map, this.map.itemInfo)
            .then(lang.hitch(this, function(operLayerInfos) {
              this.operLayerInfos = operLayerInfos;
            }));
        } else {
          var itemInfo = this._obtainMapLayers();
          LayerInfos.getInstance(this.map, itemInfo)
            .then(lang.hitch(this, function(operLayerInfos) {
              this.operLayerInfos = operLayerInfos;
            }));
        }

        html.empty(this.divResultMessage);
        this.resultLayers = [];
        this.layerUniqueCache = {};
        this._initResultFormatString();
        this._initDrawBox();
        this._initTabContainer();
        this._initBufferUnits();
        this._initSpatialRelationships();
        this._initLayerSelect();
        this._initProgressBar();
        this._initCheckForSupportedWidgets();
        this.garr = [];
        this.polygonsToDiscard = [];
        this._addBufferLayer();
        this.wManager = WidgetManager.getInstance();
        this.pManager = PanelManager.getInstance();
        aspect.before(this, "onClose", this.closeDDs);
        this.own(on(this.domNode, 'mousedown', lang.hitch(this, function (event) {
          event.stopPropagation();
          if (event.altKey) {
            var msgStr = this.nls.widgetverstr + ': ' + this.manifest.version;
            msgStr += '\n' + this.nls.wabversionmsg + ': ' + this.manifest.wabVersion;
            msgStr += '\n' + this.manifest.description;
            new Message({
              titleLabel: this.nls.widgetversion,
              message: msgStr
            });
          }
        })));

        this.fieldselectdropdown = dijit.byId("fieldselect");
        var fieldsArray = [];
        this.layerValueforFieldArray = 0;
        for (var e = 0; e < this.config.layers[this.layerValueforFieldArray].fields.field.length; e++) {
          var selectfieldDefault = false;
            if(this.config.layers[0].fields.field[e].name.search('NAME')> -1 || this.config.layers[0].fields.field[e].name.search('SPECIMEN')> -1 || this.config.layers[0].fields.field[e].name.search('HAUL')> -1 || this.config.layers[0].fields.field[e].name.search('SAMPLE')> -1 || this.config.layers[0].fields.field[e].name.search('ID')> -1){
              selectfieldDefault = true;
            }
            fieldsArray.push({disabled:false,label:this.config.layers[0].fields.field[e].name,selected:selectfieldDefault,value:this.config.layers[0].fields.field[e].name});
        }        
        this.fieldselectdropdown.addOption(fieldsArray.sort(this.comparesort));

        var yearselect = dijit.byId('yearselect'); 
        var yearsArray = [];
        var currentyear = new Date().getFullYear();
        for (var i = currentyear; i >= 1972; i--) {
            yearsArray.push({disabled:false,label:i,selected:true,value:i});
        }
        yearselect.addOption(yearsArray);

        this.fieldselectType = dijit.byId("fieldselectType");
        this.fieldselectType.onChange = lang.hitch(this, this._onfieldSelctChange);

        esriConfig.defaults.io.timeout = 600000;
        that = this;


        this.checkBoxMonth.onChange = lang.hitch(this, function(e){
          that.monthselect.set("value",[]);
          if(e){
            that.monthselect.invertSelection();
          }
          that.monthselect._updateSelection();
        });
        
        this.checkBoxYear.onChange = lang.hitch(this, function(e){
          that.yearselect.set("value",[]);
          if(e){
            that.yearselect.invertSelection();
          }
          that.yearselect._updateSelection();
        });
        this.checkBoxFields.onChange = lang.hitch(this, function(e){
          that.fieldselect.set("value",[]);
          if(e){
            that.fieldselect.invertSelection();
          }
          that.fieldselect._updateSelection();
        });
        this.checkBoxSortFields.onChange = lang.hitch(this, function(e){
          //that.fieldselect.set("value",[]);
          var fieldsArray = this.fieldselectdropdown.getOptions();
          this.fieldselectdropdown.removeOption(this.fieldselectdropdown.getOptions());
          if(e){
            this.fieldselectdropdown.addOption(fieldsArray.sort(this.comparesortselected));
          }
          else{
            this.fieldselectdropdown.addOption(fieldsArray.sort(this.comparesort));
          }
        });        
      },

      populateAllDropDowns: function(){

        $('#trawlSpeciesDD').multipleSelect({placeholder: "Search Species",filter: true});  
        $('#cruiseDD').multipleSelect({placeholder: "Search Cruise",filter: true}); 
        $('#projectDD').multipleSelect({placeholder: "Search Project",filter: true}); 
        $('#ichSpeciesDD').multipleSelect({placeholder: "Search Species",filter: true});  
        $('#taxonDD').multipleSelect({placeholder: "Search Taxon Code",filter: true});  
        $('#geo_locDD').multipleSelect({placeholder: "Search GeoLoc",filter: true}); 
        $('#gearDD').multipleSelect({placeholder: "Search Gear",filter: true}); 
        $('#cruiseSeacatDD').multipleSelect({placeholder: "Search Cruise",filter: true}); 
        $('#cruisechlorDD').multipleSelect({placeholder: "Search Cruise",filter: true}); 
        $('#cruisenutrientDD').multipleSelect({placeholder: "Search Cruise",filter: true});   
        $('#cruisectdbDD').multipleSelect({placeholder: "Search Cruise",filter: true});   
        $('#purposeDD').multipleSelect({placeholder: "Search Purpose",filter: true});    
        $('#bobSizeDD').multipleSelect({placeholder: "Search Size",filter: true});     
        $('#bobStageDD').multipleSelect({placeholder: "Search Stage",filter: true});  
        $('#ichStageDD').multipleSelect({placeholder: "Search Stage",filter: true});    

        // Cruise
        var queryTaskCruise = new QueryTask(this.config.dataproviders.cruiseArray);
        var queryCruise = new Query();
        queryCruise.where = "1=1";
        queryCruise.returnGeometry = false;
        queryCruise.orderByFields = ['SHIP_LEAVE_DATE'];
        //queryCruise.returnDistinctValues = true;
        queryTaskCruise.execute(queryCruise,function(e){         
          for (var i = 0; i < e.features.length;  i++) {
            $('#cruiseDD').append("<option value=\"" + e.features[i].attributes[e.displayFieldName] + "\">" + e.features[i].attributes[e.displayFieldName] + "</option>");
          }
          $('#cruiseDD').multipleSelect( 'refresh' );
        },function(error){
          console.log(error);
        });

        // projectArray
        var queryTaskproject = new QueryTask(this.config.dataproviders.projectArray);
        var queryproject = new Query();
        queryproject.where = "1=1";
        queryproject.returnGeometry = false;
        queryproject.orderByFields = ["PROJECT"];
        queryproject.outFields = ["PROJECT"];
        queryproject.returnDistinctValues = true;
        queryTaskproject.execute(queryproject,function(e){         
          for (var p = 0; p < e.features.length;  p++) {
            $('#projectDD').append("<option value=\"" + e.features[p].attributes['PROJECT'] + "\">" + e.features[p].attributes['PROJECT'] + "</option>");
          }
          $('#projectDD').multipleSelect( 'refresh' );
        },function(error){
          console.log(error);
        });
        // ichSpeciesArray
        var queryTaskichSpecies = new QueryTask(this.config.dataproviders.ichSpeciesArray);
        var queryichSpecies = new Query();
        queryichSpecies.where = "1=1";
        queryichSpecies.returnGeometry = false;
        queryTaskichSpecies.execute(queryichSpecies,function(e){        
          for (var a = 0; a < e.features.length;  a++) {
            $('#ichSpeciesDD').append("<option value=\"" + e.features[a].attributes[e.displayFieldName] + "\">" + e.features[a].attributes[e.displayFieldName] + "</option>");
          }
          $('#ichSpeciesDD').multipleSelect( 'refresh' );
          $('.ichSpeciesClass').hide();
        },function(error){
          console.log(error);
        });
        // trawlSpeciesArray
        var queryTasktrawlSpecies = new QueryTask(this.config.dataproviders.trawlSpeciesArray);
        var querytrawlSpecies = new Query();
        querytrawlSpecies.where = "1=1";
        querytrawlSpecies.returnGeometry = false;
        queryTasktrawlSpecies.execute(querytrawlSpecies,function(e){        
          for (var b = 0; b < e.features.length;  b++) {
            $('#trawlSpeciesDD').append("<option value=\"" + e.features[b].attributes[e.displayFieldName] + "\">" + e.features[b].attributes[e.displayFieldName] + "</option>");
          }
          $('#trawlSpeciesDD').multipleSelect( 'refresh' );
          $('.trawlSpeciesClass').hide();
        },function(error){
          console.log(error);
        });
        // taxonArray
        var queryTasktaxon = new QueryTask(this.config.dataproviders.taxonArray);
        var querytaxon = new Query();
        querytaxon.orderByFields = ["TAXON_NAME"];
        querytaxon.where = "1=1";
        querytaxon.returnGeometry = false;
        querytaxon.returnDistinctValues = true;
        queryTasktaxon.execute(querytaxon,function(e){        
          for (var c = 0; c < e.features.length;  c++) {
            $('#taxonDD').append("<option value=\"" + e.features[c].attributes[e.displayFieldName] + "\">" + e.features[c].attributes[e.displayFieldName] + "</option>");
          }
          $('#taxonDD').multipleSelect( 'refresh' );
          $('.taxonClass').hide();
        },function(error){
          console.log(error);
        });
        // geo_loc
        var queryTaskCruisegeo_loc = new QueryTask(this.config.dataproviders.geo_loc);
        var queryCruisegeo_loc = new Query();
        queryCruisegeo_loc.where = "1=1";
        queryCruisegeo_loc.orderByFields = ["GEOGRAPHIC_AREA"];
        queryCruisegeo_loc.returnGeometry = false;
        queryTaskCruisegeo_loc.execute(queryCruisegeo_loc,function(e){         
          for (var d = 0; d < e.features.length;  d++) {
            $('#geo_locDD').append("<option value=\"" + e.features[d].attributes[e.displayFieldName] + "\">" + e.features[d].attributes[e.displayFieldName] + "</option>");
          }
          $('#geo_locDD').multipleSelect( 'refresh' );
        },function(error){
          console.log(error);
        });
        // gearArray
        var queryTaskgear = new QueryTask(this.config.dataproviders.gearArray);
        var queryCruisegear = new Query();
        queryCruisegear.where = "1=1";
        queryCruisegear.returnGeometry = false;
        queryTaskgear.execute(queryCruisegear,function(e){         
          for (var f = 0; f < e.features.length;  f++) {
            $('#gearDD').append("<option value=\"" + e.features[f].attributes[e.displayFieldName] + "\">" + e.features[f].attributes[e.displayFieldName] + "</option>");
          }
          $('#gearDD').multipleSelect( 'refresh' );
        },function(error){
          console.log(error);
        });
        // cruiseArray_seacat
        var queryTaskCruiseSeacat = new QueryTask(this.config.dataproviders.cruiseArray_seacat);
        var queryCruiseSeacat = new Query();
        queryCruiseSeacat.where = "1=1";
        queryCruiseSeacat.orderByFields = ['CRUISE'];
        queryCruiseSeacat.returnGeometry = false;
        queryTaskCruiseSeacat.execute(queryCruiseSeacat,function(e){         
          for (var g = 0; g < e.features.length;  g++) {
            $('#cruiseSeacatDD').append("<option value=\"" + e.features[g].attributes[e.displayFieldName] + "\">" + e.features[g].attributes[e.displayFieldName] + "</option>");
          }
          $('#cruiseSeacatDD').multipleSelect( 'refresh' );
          $('#cruiseSeacatDD').next().hide();
        },function(error){
          console.log(error);
        });
        // cruiseArray_chlor
        var queryTaskCruisechlor = new QueryTask(this.config.dataproviders.cruiseArray_chlor);
        var queryCruisechlor = new Query();
        queryCruisechlor.where = "1=1";
        queryCruisechlor.returnGeometry = false;
        queryCruisechlor.orderByFields = ['CRUISE'];
        queryTaskCruisechlor.execute(queryCruisechlor,function(e){       
          for (var h = 0; h < e.features.length;  h++) {
            $('#cruisechlorDD').append("<option value=\"" + e.features[h].attributes[e.displayFieldName] + "\">" + e.features[h].attributes[e.displayFieldName] + "</option>");
          }
          $('#cruisechlorDD').multipleSelect( 'refresh' );
          $('#cruisechlorDD').next().hide();
        },function(error){
          console.log(error);
        });
        // cruiseArray_nutrient
        var queryTaskCruiseNut = new QueryTask(this.config.dataproviders.cruiseArray_nutrient);
        var queryCruiseNut = new Query();
        queryCruiseNut.where = "1=1";
        queryCruiseNut.returnGeometry = false;
        queryCruiseNut.orderByFields = ['CRUISE'];
        queryTaskCruiseNut.execute(queryCruiseNut,function(e){        
          for (var j = 0; j < e.features.length;  j++) {
            $('#cruisenutrientDD').append("<option value=\"" + e.features[j].attributes[e.displayFieldName] + "\">" + e.features[j].attributes[e.displayFieldName] + "</option>");
          }
          $('#cruisenutrientDD').multipleSelect( 'refresh' );
          $('#cruisenutrientDD').next().hide();
        },function(error){
          console.log(error);
        });
        // cruiseArray_ctdb
        var queryTaskCruiseCTDB = new QueryTask(this.config.dataproviders.cruiseArray_ctdb);
        var queryCruiseCTDB = new Query();
        queryCruiseCTDB.where = "1=1";
        queryCruiseCTDB.returnGeometry = false;
        queryCruiseCTDB.orderByFields = ['CRUISE'];
        queryTaskCruiseCTDB.execute(queryCruiseCTDB,function(e){       
          for (var j = 0; j < e.features.length;  j++) {
            $('#cruisectdbDD').append("<option value=\"" + e.features[j].attributes[e.displayFieldName] + "\">" + e.features[j].attributes[e.displayFieldName] + "</option>");
          }
          $('#cruisectdbDD').multipleSelect( 'refresh' );
          $('#cruisectdbDD').next().hide();
        },function(error){
          console.log(error);
        });
        // purposeArray
        var queryTaskpurpose = new QueryTask(this.config.dataproviders.purposeArray);
        var querypurpose = new Query();
        querypurpose.where = "1=1";
        querypurpose.returnGeometry = false;
        queryTaskpurpose.execute(querypurpose,function(e){      
          for (var k = 0; k < e.features.length;  k++) {
            $('#purposeDD').append("<option value=\"" + e.features[k].attributes[e.displayFieldName] + "\">" + e.features[k].attributes[e.displayFieldName] + "</option>");
          }
          $('#purposeDD').multipleSelect( 'refresh' );
        },function(error){
          console.log(error);
        });
        // ichStageArray
        var queryTaskichStage = new QueryTask(this.config.dataproviders.ichStageArray);
        var queryichStage = new Query();
        queryichStage.where = "1=1";
        queryichStage.returnGeometry = false;
        queryTaskichStage.execute(queryichStage,function(e){        
          for (var q = 0; q < e.features.length;  q++) {
            $('#ichStageDD').append("<option value=\"" + e.features[q].attributes[e.displayFieldName] + "\">" + e.features[q].attributes[e.displayFieldName] + "</option>");
          }
          $('#ichStageDD').multipleSelect( 'refresh' );
          $('.ichStageClass').hide();
        },function(error){
          console.log(error);
        });
        // bobSizeArray
        var queryTaskbobSize = new QueryTask(this.config.dataproviders.bobSizeArray);
        var querybobSize = new Query();
        querybobSize.where = "1=1";
        querybobSize.returnGeometry = false;
        querybobSize.returnDistinctValues = true;
        queryTaskbobSize.execute(querybobSize,function(e){       
          for (var v = 0; v < e.features.length;  v++) {
            $('#bobSizeDD').append("<option value=\"" + e.features[v].attributes[e.displayFieldName] + "\">" + e.features[v].attributes[e.displayFieldName] + "</option>");
          }
          $('#bobSizeDD').multipleSelect( 'refresh' );
          $('.bobSizeClass').hide();
        },function(error){
          console.log(error);
        });
        // bobStageArray
        var queryTaskbobStage = new QueryTask(this.config.dataproviders.bobStageArray);
        var querybobStage = new Query();
        querybobStage.where = "1=1";
        querybobStage.returnDistinctValues = true;
        querybobStage.returnGeometry = false;
        queryTaskbobStage.execute(querybobStage,function(e){     
          for (var x = 0; x < e.features.length;  x++) {
            $('#bobStageDD').append("<option value=\"" + e.features[x].attributes[e.displayFieldName] + "\">" + e.features[x].attributes[e.displayFieldName] + "</option>");
          }
          $('#bobStageDD').multipleSelect( 'refresh' );
          $('.bobStageClass').hide();
        },function(error){
          console.log(error);
        });

        $('#performanceDD').multipleSelect({placeholder: "Performance"});  
        $('#zoopProtocolDD').multipleSelect({placeholder: "Zoop Protocol"});  //ZOOP_PROTOCOL 
        $('.zoopProtocolClass').hide();
        $('#sexDD').multipleSelect({placeholder: "Search Sex"});  //SEX = value
        $('#meshDD').multipleSelect({placeholder: "Search Mesh"});  
        $('#primaryNetDD').multipleSelect({placeholder: "Primary Net"});  
        $('#netDD').multipleSelect({placeholder: "Search Net"});  
        $('#specieTypeDD').multipleSelect({placeholder: "Database",
          single: true,
          onClick: function(view) {
                /*
              view.label: the text of the checkbox item
              view.checked: the checked of the checkbox item
              */
              that.SAMPLETYPE = view.value;
              that.onAttributeLayerChange(2); //sample_TYPE
          }});//orig_db
        $('#sampleTypeDD').multipleSelect({
          placeholder: "Sample Type"
        });
        $('.specieTypeClass').hide();
        $('.sexClass').hide();
      },

      startup: function(){
        this.inherited(arguments);
        this.fetchData();
        this.list.parentWidget = this;
      },

      _containsObject: function (obj, list) {
          var i;
          for (i = 0; i < list.length; i++) {
              if (list[i].label === obj) {
                  return true;
              }
          }
          return false;
      },

      _onfieldSelctChange: function(type){
        if(type>0){
          this.fieldselectdropdown.removeOption(this.fieldselectdropdown.getOptions());
          var fieldsArray = []; 
        }

        //no filter
        if(type == 0){
          var fieldsArray = this.fieldselectdropdown.getOptions();
          this.fieldselectdropdown.removeOption(this.fieldselectdropdown.getOptions());
          for (var e = 0; e < this.config.layers[this.layerValueforFieldArray].fields.field.length; e++) {
            var selectfieldDefault = false;
            if(this.config.layers[this.layerValueforFieldArray].fields.field[e].name.search('NAME')> -1){// this.config.layers[this.layerValueforFieldArray].fields.field[e].name.search('HAUL')> -1 || this.config.layers[this.layerValueforFieldArray].fields.field[e].name.search('ID')> -1 ||
              selectfieldDefault = true;
            }
            if(!that._containsObject(this.config.layers[this.layerValueforFieldArray].fields.field[e].name,fieldsArray)){
              fieldsArray.push({disabled:false,label:this.config.layers[this.layerValueforFieldArray].fields.field[e].name,selected:selectfieldDefault,value:this.config.layers[this.layerValueforFieldArray].fields.field[e].name});    
            }            
          }
        }
        //ICH
        else if( type == 1){
          for (var e = 0; e < this.config.layers[this.layerValueforFieldArray].fields.field.length; e++) {
            if(this.config.ichfields.indexOf(this.config.layers[this.layerValueforFieldArray].fields.field[e].name) > -1){
              if(this.config.ichfieldselected.indexOf(this.config.layers[this.layerValueforFieldArray].fields.field[e].name) > -1){
                fieldsArray.push({disabled:false,label:this.config.layers[this.layerValueforFieldArray].fields.field[e].name,selected:true,value:this.config.layers[this.layerValueforFieldArray].fields.field[e].name});  
              } else {
                fieldsArray.push({disabled:false,label:this.config.layers[this.layerValueforFieldArray].fields.field[e].name,selected:false,value:this.config.layers[this.layerValueforFieldArray].fields.field[e].name});  
              }
            }
          }
        }
        //Zoop
        else if( type == 2){
          for (var e = 0; e < this.config.layers[this.layerValueforFieldArray].fields.field.length; e++) {
            if(this.config.zoopfields.indexOf(this.config.layers[this.layerValueforFieldArray].fields.field[e].name) > -1){
              if(this.config.zoopfieldselected.indexOf(this.config.layers[this.layerValueforFieldArray].fields.field[e].name) > -1){
                fieldsArray.push({disabled:false,label:this.config.layers[this.layerValueforFieldArray].fields.field[e].name,selected:true,value:this.config.layers[this.layerValueforFieldArray].fields.field[e].name});  
              } else {
                fieldsArray.push({disabled:false,label:this.config.layers[this.layerValueforFieldArray].fields.field[e].name,selected:false,value:this.config.layers[this.layerValueforFieldArray].fields.field[e].name});  
              }
            }
          }
        }
        //trawl
        else if( type == 3){
          for (var e = 0; e < this.config.layers[this.layerValueforFieldArray].fields.field.length; e++) {
            if(this.config.trawlfields.indexOf(this.config.layers[this.layerValueforFieldArray].fields.field[e].name) > -1){
              if(this.config.trawlfieldselected.indexOf(this.config.layers[this.layerValueforFieldArray].fields.field[e].name) > -1){
                fieldsArray.push({disabled:false,label:this.config.layers[this.layerValueforFieldArray].fields.field[e].name,selected:true,value:this.config.layers[this.layerValueforFieldArray].fields.field[e].name});  
              } else {
                fieldsArray.push({disabled:false,label:this.config.layers[this.layerValueforFieldArray].fields.field[e].name,selected:false,value:this.config.layers[this.layerValueforFieldArray].fields.field[e].name});  
              }
            }
          }
        }
                
        this.fieldselectdropdown.addOption(fieldsArray.sort(this.comparesort));
      },

      comparesortselected: function (a,b) {
        if (a.selected < b.selected)
          return 1;
        if (a.selected > b.selected)
          return -1;
        return 0;
      },

      comparesort: function (a,b) {
        if (a.label < b.label)
          return -1;
        if (a.label > b.label)
          return 1;
        return 0;
      },

      updateFieldDropdownGeo: function(layerval){
        this.fieldselectdropdown.removeOption(this.fieldselectdropdown.getOptions());
        
        var fieldsArray = [];
        this.layerValueforFieldArray = layerval;
        this.fieldselectType.set('value', 0);
        
        this.selectLayerAttribute.set('value', layerval);
        for (var e = 0; e < this.config.layers[this.layerValueforFieldArray].fields.field.length; e++) {
          var selectfieldDefault = false;
          if(layerval > 8 || this.config.layers[this.layerValueforFieldArray].fields.field[e].name.search('NAME')> -1 || this.config.layers[this.layerValueforFieldArray].fields.field[e].name.search('HAUL')> -1  || this.config.layers[this.layerValueforFieldArray].fields.field[e].name.search('ID')> -1){
              selectfieldDefault = true;
            }
          fieldsArray.push({disabled:false,label:this.config.layers[this.layerValueforFieldArray].fields.field[e].name,selected:selectfieldDefault,value:this.config.layers[this.layerValueforFieldArray].fields.field[e].name});
        }
        this.fieldselectdropdown.addOption(fieldsArray.sort(this.comparesort));
      },

      updateFieldDropdownAtt: function(layerval){
        this.fieldselectdropdown.removeOption(this.fieldselectdropdown.getOptions());
        
        var fieldsArray = [];
        this.layerValueforFieldArray = layerval;
        this.fieldselectType.set('value', 0);
        if(layerval < 9){
          this.selectLayerGraphical.set('value', layerval);  
        }
        for (var e = 0; e < this.config.layers[this.layerValueforFieldArray].fields.field.length; e++) {
          var selectfieldDefault = false;
          if(layerval > 8 || this.config.layers[this.layerValueforFieldArray].fields.field[e].name.search('NAME')> -1 || this.config.layers[this.layerValueforFieldArray].fields.field[e].name.search('HAUL')> -1 || this.config.layers[this.layerValueforFieldArray].fields.field[e].name.search('ID')> -1){
              selectfieldDefault = true;
            }
          fieldsArray.push({disabled:false,label:this.config.layers[this.layerValueforFieldArray].fields.field[e].name,selected:selectfieldDefault,value:this.config.layers[this.layerValueforFieldArray].fields.field[e].name});
        }
        this.fieldselectdropdown.addOption(fieldsArray.sort(this.comparesort));
      },

      _obtainMapLayers: function() {
        // summary:
        //    obtain basemap layers and operational layers if the map is not webmap.
        var basemapLayers = [],
          operLayers = [];
        // emulate a webmapItemInfo.
        var retObj = {
          itemData: {
            baseMap: {
              baseMapLayers: []
            },
            operationalLayers: []
          }
        };
        array.forEach(this.map.graphicsLayerIds, function(layerId) {
          var layer = this.map.getLayer(layerId);
          if (layer.isOperationalLayer) {
            operLayers.push({
              layerObject: layer,
              title: layer.label || layer.title || layer.name || layer.id || " ",
              id: layer.id || " "
            });
          }
        }, this);
        array.forEach(this.map.layerIds, function(layerId) {
          var layer = this.map.getLayer(layerId);
          if (layer.isOperationalLayer) {
            operLayers.push({
              layerObject: layer,
              title: layer.label || layer.title || layer.name || layer.id || " ",
              id: layer.id || " "
            });
          } else {
            basemapLayers.push({
              layerObject: layer,
              id: layer.id || " "
            });
          }
        }, this);

        retObj.itemData.baseMap.baseMapLayers = basemapLayers;
        retObj.itemData.operationalLayers = operLayers;
        return retObj;
      },

      _initCheckForSupportedWidgets: function () {
        if(this.eLocateEnabled){
          array.forEach(this.map.graphicsLayerIds, lang.hitch(this, function(glId){
            var layer = this.map.getLayer(glId);
            if(layer.name && layer.name.toLowerCase() === "elocate results"){
              this.locateGraphicsLayer = layer;

              on(this.locateGraphicsLayer, 'graphic-add', lang.hitch(this, this.checkeLocateNumGras));
              on(this.locateGraphicsLayer, 'graphic-remove', lang.hitch(this, this.checkeLocateNumGras));
              on(this.locateGraphicsLayer, 'graphic-clear',  lang.hitch(this, this.checkeLocateNumGras));
              this.eLocateGLFound = true;

              //Add the button
              var itemsDiv = dojoQuery('.draw-items', this.drawBox.domNode);
              var eLocateButton = html.create('div', {
                'style': 'display:none;',
                'class': 'draw-item',
                'data-gratype': 'ELOCATE',
                'title': this.nls.eLocateTip
              }, itemsDiv[0]);
              html.addClass(eLocateButton, 'elocate-icon');
              this.own(on(eLocateButton, 'click', lang.hitch(this, this._eLocateButtonOnClick)));

              if(this.locateGraphicsLayer.graphics.length > 0){
                this.checkeLocateNumGras();
              }
            }
          }));
          if(!this.eLocateGLFound){
            this.own(this.mapLayerAddResultEvent = this.map.on('layer-add-result', lang.hitch(this, this.checkForeLocateGL)));
          }
        }
      },

      _initResultFormatString: function () {
        this.list._wrapResults = this.config.resultFormat.wrap || false;
        var tBold = false, tItalic = false, tUnder = false, tColorHex = "#000000";
        var vBold = false, vItalic = false, vUnder = false, vColorHex = "#000000";
        this.resultFormatString = "";
        if(this.config.resultFormat){
          var attribName = '[attribname]';
          tBold = this.config.resultFormat.attTitlesymbol.bold;
          tItalic = this.config.resultFormat.attTitlesymbol.italic;
          tUnder = this.config.resultFormat.attTitlesymbol.underline;
          if(this.config.resultFormat.attTitlesymbol.color){
            tColorHex = new Color(this.config.resultFormat.attTitlesymbol.color).toHex();
          }
          if(tBold){
            attribName = "<strong>" + attribName + "</strong>";
          }
          if(tItalic){
            attribName = "<em>" + attribName + "</em>";
          }
          if(tUnder){
            attribName = "<u>" + attribName + "</u>";
          }
          if(tColorHex){
            attribName = "<font color='" + tColorHex + "'>" + attribName + "</font>";
          }
          var attribValue = '[attribvalue]';
          vBold = this.config.resultFormat.attValuesymbol.bold;
          vItalic = this.config.resultFormat.attValuesymbol.italic;
          vUnder = this.config.resultFormat.attValuesymbol.underline;
          if(this.config.resultFormat.attValuesymbol.color){
            vColorHex = new Color(this.config.resultFormat.attValuesymbol.color).toHex();
          }
          if(vBold){
            attribValue = "<strong>" + attribValue + "</strong>";
          }
          if(vItalic){
            attribValue = "<em>" + attribValue + "</em>";
          }
          if(vUnder){
            attribValue = "<u>" + attribValue + "</u>";
          }
          if(vColorHex){
            attribValue = "<font color='" + vColorHex + "'>" + attribValue + "</font>";
          }
          this.resultFormatString = attribName + ": " + attribValue + '<br>';
        }else{
          this.resultFormatString = '<font><em>[attribname]</em></font>: <font>[attribvalue]</font><br>';
        }
      },

      onReceiveData: function(name, widgetId, data) {
        if(data.message && data.message === "Deactivate_DrawTool"){
          this.drawBox.deactivate();
        }
      },

      _getFeatureSet: function(){
        var layer = this.currentSearchLayer;
        var featureSet = new FeatureSet();
        featureSet.fields = lang.clone(layer.fields);
        featureSet.features = [].concat(layer.graphics);
        featureSet.geometryType = layer.geometryType;
        featureSet.fieldAliases = {};
        array.forEach(featureSet.fields, lang.hitch(this, function(fieldInfo){
          var fieldName = fieldInfo.name;
          var fieldAlias = fieldInfo.alias || fieldName;
          featureSet.fieldAliases[fieldName] = fieldAlias;
        }));
        return featureSet;
      },

      _onBtnMenuClicked: function(evt){
        var position = html.position(evt.target || evt.srcElement);
        var featureSet = this._getFeatureSet();

        var layer = this.currentSearchLayer;
        if(!layer.fields){
          layer.fields = [];
        }
        if(!featureSet.geometryType && layer.graphics.length >0){
          var geomType = "";
          switch(layer.graphics[0].geometry.type){
            case "point":
            case "multipoint":
              geomType = "esriGeometryPoint";
              break;
            case "polygon":
            case "extent":
              geomType = "esriGeometryPolygon";
              break;
            case "polyline":
              geomType = "esriGeometryPolyline";
              break;
          }
          featureSet.geometryType = geomType;
          featureSet.fields = [];
        }
        var layerConfig = this.config.layers[this.currentLayerIndex];
        var noStats = this.getNoStatFieldNames(layerConfig);
        this.featureActionManager.getSupportedActions(featureSet, layer).then(lang.hitch(this, function(actions){
          array.forEach(actions, lang.hitch(this, function(action){
            //console.info(action);
            if(action.name === "eShowStatistics"){
              if(noStats.length > 0){
                var gFlds = array.filter(featureSet.fields, lang.hitch(this, function(field){
                  return noStats.indexOf(field.name) === -1;
                }));
                featureSet.fields = gFlds;
              }
              action.data = featureSet;
            }else{
              action.data = featureSet;
            }
          }));

          if(layerConfig.relates && layerConfig.relates.relate && this.list.hasSelectedItem()){
            var showRelateAction = new BaseFeatureAction({
              name: "eShowRelate",
              iconClass: 'icon-show-related-record',
              label: this.nls._featureAction_eShowRelate,
              iconFormat: 'svg',
              map: this.map,
              onExecute: lang.hitch(this, function(){
                this._relateResultItem(0, this.list.getSelectedItem());
              })
            });
            showRelateAction.name = "eShowRelate";
            showRelateAction.data = featureSet;
            actions.push(showRelateAction);
          }

          if(!layerConfig.export2Geo){
            actions = array.filter(actions, lang.hitch(this, function(action){
              return action.name !== 'ExportToGeoJSON';
            }));
          }

          if(!layerConfig.export2FC){
            actions = array.filter(actions, lang.hitch(this, function(action){
              return action.name !== 'ExportToFeatureCollection';
            }));
          }

          actions = array.filter(actions, lang.hitch(this, function(action){
            return action.name !== 'CreateLayer' && action.name !== 'ShowStatistics' && action.name !== 'ExportToCSV';
          }));

          if(layerConfig.export2Csv){
            var exportCSVAction = new BaseFeatureAction({
              name: "eExportToCSV",
              iconClass: 'icon-export',
              label: this.nls._featureAction_eExportToCSV,
              iconFormat: 'svg',
              map: this.map,
              onExecute: lang.hitch(this, function(){
                CSVUtils.exportCSV(this.currentSearchLayer.name, this.currentCSVResults.data, this.currentCSVResults.columns);
              })
            });
            exportCSVAction.name = "eExportToCSV";
            exportCSVAction.data = featureSet;
            actions.push(exportCSVAction);
          }

          if(this.initiator && this.initiator === 'attribute' && this.config.exportsearchurlchecked){
            var exportUrlAction = new BaseFeatureAction({
              name: "exportSearchUrl",
              iconClass: 'icon-export',
              label: this.nls.exporturl,
              iconFormat: 'svg',
              map: this.map,
              onExecute: lang.hitch(this, this.exportURL)
            });
            exportUrlAction.name = "exportSearchUrl";
            exportUrlAction.data = featureSet;
            actions.push(exportUrlAction);
          }

          if(this.graphicsLayerBuffer && this.graphicsLayerBuffer.graphics.length > 0){
            var removeBufferAction = new BaseFeatureAction({
              name: "RemoveBufferResult",
              iconClass: 'icon-close',
              label: this.nls.clearBuffer,
              iconFormat: 'svg',
              map: this.map,
              onExecute: lang.hitch(this,  this.clearbuffer)
            });
            removeBufferAction.name = "RemoveBufferResult";
            removeBufferAction.data = featureSet;
            actions.push(removeBufferAction);
          }

          var removeAction = new BaseFeatureAction({
            name: "CleareSearchResult",
            iconClass: 'icon-close',
            label: this.nls.clearResults,
            iconFormat: 'svg',
            map: this.map,
            onExecute: lang.hitch(this, this.clear)
          });
          removeAction.name = "CleareSearchResult";
          removeAction.data = featureSet;
          actions.push(removeAction);

          if(this.relateLayers && this.relateLayers.length > 0){
            var removeAction2 = new BaseFeatureAction({
              name: "ClearRelateResult",
              iconClass: 'icon-close',
              label: this.nls.clearRelates,
              iconFormat: 'svg',
              map: this.map,
              onExecute: lang.hitch(this, this._clearRelateLayers)
            });
            removeAction2.name = "ClearRelateResult";
            removeAction2.data = featureSet;
            actions.push(removeAction2);
          }

          this.popupMenu.setActions(actions);
          this.popupMenu.show(position);
        }));
      },

      resetFeatureActions: function(featureSet, layer) {
        this.featureActionManager.getSupportedActions(featureSet, layer).then(lang.hitch(this, function(actions){
          array.forEach(actions, lang.hitch(this, function(action){
            action.data = featureSet;
          }));
          this.popupMenu.setActions(actions);
        }));
      },

      getNoStatFieldNames: function(layerConfig){
        var retval = [];
        array.forEach(layerConfig.fields.field, lang.hitch(this, function(fld){
          if(fld.excludestat){
            retval.push(fld.name);
          }
        }));
        return retval;
      },

      checkForeLocateGL: function (result) {
        if(result.layer.name && result.layer.name.toLowerCase() === "elocate results"){
          this.locateGraphicsLayer = result.layer;
          on(this.locateGraphicsLayer, 'graphic-add', lang.hitch(this, this.checkeLocateNumGras));
          on(this.locateGraphicsLayer, 'graphic-remove', lang.hitch(this, this.checkeLocateNumGras));
          on(this.locateGraphicsLayer, 'graphic-clear',  lang.hitch(this, this.checkeLocateNumGras));
          this.mapLayerAddResultEvent.remove();

          //Add the button
          var itemsDiv = dojoQuery('.draw-items', this.drawBox.domNode);
          var eLocateButton = html.create('div', {
            'style': 'display:none;',
            'class': 'draw-item',
            'data-gratype': 'ELOCATE',
            'title': this.nls.eLocateTip
          }, itemsDiv[0]);
          html.addClass(eLocateButton, 'elocate-icon');
          this.own(on(eLocateButton, 'click', lang.hitch(this, this._eLocateButtonOnClick)));
        }
      },

      checkeLocateNumGras: function (){
        if(this.locateGraphicsLayer){
          var eLocateButton = dojoQuery('.draw-item.elocate-icon', this.drawBox.domNode);
          if(this.locateGraphicsLayer.graphics.length > 0){
            //show the button
            html.setStyle(eLocateButton[0], 'display', 'block');
          }else{
            //hide the button
            html.setStyle(eLocateButton[0], 'display', 'none');
          }
        }
      },

      _eLocateButtonOnClick: function() {
        var graLayGras = this.locateGraphicsLayer.graphics;
        if (graLayGras.length > 1){
          this.processInputs(this.unionGeoms(graLayGras));
        }else if (graLayGras.length == 1){
          this.processInputs(graLayGras[0].geometry);
        }
      },

      processInputs: function (geom) {
        if (geom === Polygon && geom.isSelfIntersecting(geom)){
          esriConfig.defaults.geometryService.simplify([geom], lang.hitch(this, function (result) {
            if (this.cbxBufferGraphic.getValue()) {
              this._bufferGeometries([geom], new SpatialReference({
                wkid: this.bufferWKID
              }), [parseFloat(this.txtBufferValue.get('value'))], this.bufferUnits.get('value'), true);
            } else {
              this.search(result[0], this.graphicLayerIndex);
            }
          }));
        }else{
          //create extent around map point to improve search results
          if (geom.type === "point" && this.cbxAddTolerance.getValue()) {
            geom = this.pointToExtent(geom, this.pointSearchTolerance);
          }
          if (this.cbxBufferGraphic.getValue()) {
            this._bufferGeometries([geom], new SpatialReference({
              wkid: this.bufferWKID
            }), [parseFloat(this.txtBufferValue.get('value'))], this.bufferUnits.get('value'), true);
          } else {
            this.search(geom, this.graphicLayerIndex);
          }
        }
      },

      _addBufferLayer: function () {
        if (this.config.bufferDefaults.addtolegend) {
          //new a feature layer
          var layerInfo = {
            "type" : "Feature Layer",
            "description" : "",
            "definitionExpression" : "",
            "name": "Search Buffer Results",
            "geometryType": "esriGeometryPolygon",
            "objectIdField": "ObjectID",
            "drawingInfo": {
              "renderer": {
                "type": "simple",
                "label": "Buffer",
                "description" : "Buffer",
                "symbol": this.config.bufferDefaults.simplefillsymbol
              }
            },
            "fields": [{
              "name": "ObjectID",
              "alias": "ObjectID",
              "type": "esriFieldTypeOID"
            }, {
              "name": "bufferdist",
              "alias": "Buffer Distance",
              "type": "esriFieldTypeString"
            }]
          };

          var featureCollection = {
            layerDefinition: layerInfo,
            featureSet: null
          };
          this.graphicsLayerBuffer = new FeatureLayer(featureCollection);
          this.graphicsLayerBuffer.name = "Search Buffer Results";
        } else {
          //use graphics layer
          this.graphicsLayerBuffer = new GraphicsLayer();
          this.graphicsLayerBuffer.name = "Search Buffer Results";
          this.map.addLayer(this.graphicsLayerBuffer);
        }
      },

      closeDDs: function () {
        this.selectLayerAttribute.closeDropDown();
        this.selectLayerGraphical.closeDropDown();
        //this.selectExpression.closeDropDown();
        //this.selectLayerSpatial.closeDropDown();
        this.gSelectType.closeDropDown();
        this.aSelectType.closeDropDown();
      },

      onDeactivate: function() {
        this.drawBox.deactivate();
      },

      onClose: function () {
        this.drawBox.deactivate();
        this._hideInfoWindow();
        this.inherited(arguments);
        if (!this.config.bufferDefaults.addtolegend) {
          if (this.graphicsLayerBuffer) {
            this.graphicsLayerBuffer.hide();
          }
        }
        if (this.tempResultLayer) {
          this.tempResultLayer.hide();
        }
      },

      onOpen: function () {
        if (!this.config.bufferDefaults.addtolegend) {
          if (this.graphicsLayerBuffer) {
            this.graphicsLayerBuffer.show();
          }
        }
        if (this.tempResultLayer) {
          this.tempResultLayer.show();
        }
      },

      _resetDrawBox: function () {
        this.drawBox.deactivate();
        this.drawBox.clear();
      },

      destroy: function () {
        this._hideInfoWindow();
        this._resetDrawBox();
        this._removeAllResultLayers();
        this._clearRelateLayers();
        this.inherited(arguments);
      },

      _removeAllResultLayers: function () {
        this._hideInfoWindow();
        this._removeTempResultLayer();
        this._removeAllOperatonalLayers();
      },

      _removeAllOperatonalLayers: function () {
        var layers = this.operationalLayers;
        while (layers.length > 0) {
          var layer = layers[0];
          if (layer) {
            this.map.removeLayer(layer);
          }
          layers[0] = null;
          layers.splice(0, 1);
        }
        this.operationalLayers = [];
      },

      _removeAllRelateLayers: function () {
        var layers = this.relateLayers;
        if(layers && layers.length > 0){
          while (layers.length > 0) {
            var layer = layers[0];
            if (layer) {
              this.map.removeLayer(layer);
            }
            layers[0] = null;
            layers.splice(0, 1);
          }
          this.relateLayers = [];
        }
      },

      _addOperationalLayer: function (resultLayer) {
        this.operationalLayers.push(resultLayer);
        this.map.addLayer(resultLayer);
      },

      _addRelateLayer: function (resultLayer) {
        if(this.relateLayers.indexOf(resultLayer) === -1){
          this.relateLayers.push(resultLayer);
          this.map.addLayer(resultLayer);
        }else{
          resultLayer.clear();
        }
      },

      _resetAndAddTempResultLayer: function (layerIndex) {
        this._removeTempResultLayer();
        this.tempResultLayer = new GraphicsLayer();
        this.tempResultLayer.name = "Search Results";
        var layerConfig = this.config.layers[layerIndex];
        var lyrDisablePopupsAndTrue = (layerConfig.hasOwnProperty("disablePopups") && layerConfig.disablePopups)?true:false;
        if(!this.config.disablePopups && !lyrDisablePopupsAndTrue){
          this.tempResultLayer.infoTemplate = new PopupTemplate();
        }
        this.map.addLayer(this.tempResultLayer);
      },

      _removeTempResultLayer: function () {
        if (this.tempResultLayer) {
          this.map.removeLayer(this.tempResultLayer);
        }
        this.tempResultLayer = null;
      },

      onSpatialLayerChange: function (newValue) {
        this.spatialLayerIndex = newValue;
      },

      onGraphicalLayerChange: function (newValue) {

        this.updateFieldDropdownGeo(newValue);
        this.graphicLayerIndex = newValue;
        //determine if this layer has any expressions
        if(this.config.layers[newValue].expressions.expression.length > 0){
          this.cbxAddTextQuery.setStatus(true);
        }else{
          this.cbxAddTextQuery.setStatus(false);
        }
        //determine if this layer has any sum field(s)
        this._getSumFields(newValue);
        if(this.sumFields.length > 0){
          html.addClass(this.list.domNode, 'sum');
          html.setStyle(this.divSum, 'display', '');
        }else{
          html.removeClass(this.list.domNode, 'sum');
          html.setStyle(this.divSum, 'display', 'none');
        }
      },

      //update table list
      onAttributeLayerChange: function (newValue) {

        this.updateFieldDropdownAtt(newValue);
        this.AttributeLayerIndex = newValue;
        //set the graphical layer to be the same
        this.graphicLayerIndex = newValue;

        /*all values
        $('#cruiseSeacatDD').multipleSelect('getSelects');
        $('#cruisectdbDD').multipleSelect('getSelects');
        $('#cruisenutrientDD').multipleSelect('getSelects');
        $('#cruisechlorDD').multipleSelect('getSelects');
        
        $('#geo_locDD').multipleSelect('getSelects');
        $('#gearDD').multipleSelect('getSelects');

        $('#specieTypeDD').multipleSelect('getSelects');
        $('#sampleTypeDD').multipleSelect('getSelects');
        $('#cruiseDD').multipleSelect('getSelects');
        $('#projectDD').multipleSelect('getSelects');
        $('#purposeDD').multipleSelect('getSelects');
        $('#netDD').multipleSelect('getSelects');
        $('#primaryNetDD').multipleSelect('getSelects');
        $('#meshDD').multipleSelect('getSelects');
        $('#performanceDD').multipleSelect('getSelects');
        $('#sexDD').multipleSelect('getSelects');

        $('#ichStageDD').multipleSelect('getSelects');
        $('#bobSizeDD').multipleSelect('getSelects');
        $('#bobStageDD').multipleSelect('getSelects');
        $('#ichSpeciesDD').multipleSelect('getSelects');
        $('#trawlSpeciesDD').multipleSelect('getSelects');
        $('#taxonDD').multipleSelect('getSelects');

        minBottom
        maxBottom
        minGearDepth
        maxGearDepth

        btnSearchCatchwZero
        btnSearchTrawlLength
        btnSearchAbundance
        btnSearchFrequency
        
        haulidtext

        depthSpinners
        */
        
        $('#haulidtext').show();
        $('#searchDiv').show();
        $('#tableSearch').hide();

        $('#btnSearchCatchwZero').hide();
        $('#btnSearchTrawlLength').hide();
        $('#btnSearchAbundance').hide();
        $('#btnSearchFrequency').hide();
        $('#limitMapExtentDiv').show();

        $('#cruiseSeacatDD').next().hide();
        $('#cruisechlorDD').next().hide();
        $('#cruisenutrientDD').next().hide();
        $('#cruisectdbDD').next().hide();

        $('.specieTypeClass').hide();
        $('.cruiseClass').not('select').show();
        $('.projectClass').not('select').show();
        $('.netClass').not('select').show();
        $('.primaryNetClass').not('select').show();
        $('.meshClass').not('select').show();
        $('.performanceClass').not('select').show();
        $('.sexClass').not('select').show();
        $('.gearSpinneClass');
        $('.bobSizeClass').hide();
        $('.bobStageClass').hide();
        $('.zoopProtocolClass').hide();
        $('.trawlSpeciesClass').hide();
        $('.ichStageClass').hide();
        $('.ichSpeciesClass').hide();
        $('.taxonClass').hide();
        $('.sampleTypeClass').hide();

        $('#gearSpinners').show();

        if(newValue == 0){//sample
          $('.sampleTypeClass').not('select').show();
          $('.sexClass').hide();
        }
        else if(newValue == 1){//haul
            $('#haulidtext').not('select').show();
            $('.sexClass').hide();
        }
        else if(newValue == 2){//specimen
          if(that.SAMPLETYPE == "TRAWL"){
            $('.trawlSpeciesClass').not('select').show();
            $('#btnSearchTrawlLength').not('select').show();
          }
          else if(that.SAMPLETYPE == "ICHBASE"){
            $('.ichStageClass').not('select').show();
            $('.ichSpeciesClass').not('select').show();
            $('#btnSearchAbundance').not('select').show();
            $('.sexClass').not('select').hide();
          }
          else{//BOB
            $('.bobSizeClass').not('select').show();
            $('.bobStageClass').not('select').show();
            $('.taxonClass').not('select').show();
            $('.zoopProtocolClass').not('select').show();
          }

          $('#btnSearchCatchwZero').not('select').show();
          $('.specieTypeClass').not('select').show();
        }
        else if(newValue == 3){//sub spec
          $('.ichStageClass').not('select').show();
          $('.ichSpeciesClass').not('select').show();
          $('#btnSearchFrequency').not('select').show();
          $('.sexClass').not('select').hide();
        }
        else if(newValue>3 && newValue <9){
          $('.specieTypeClass').hide();
          $('.sampleTypeClass').hide();
          $('.cruiseClass').hide();
          $('.projectClass').hide();
          $('.netClass').hide();
          $('.primaryNetClass').hide();
          $('.meshClass').hide();
          $('.performanceClass').hide();
          $('.sexClass').hide();
          $('.gearSpinneClass');

          if(newValue == 4){//seacat
            $('#cruiseSeacatDD').next().show();
          }
          else if(newValue == 5){//chlor
            $('#cruisechlorDD').next().show();
          }
          else if(newValue == 6){//nutrient
            $('#cruisenutrientDD').next().show();
          }
          else if(newValue == 8){//diet
            $('#cruiseDD').next().show();
            //$('.ichStageClass').not('select').show();
            //$('.ichSpeciesClass').not('select').show();
            //$('.cruiseClass').show();
          }
          else {//ctdb
            $('#cruisectdbDD').next().show();
          }
        }
        else{
          //table display all
          $('#searchDiv').hide();
          $('#tableSearch').show();
          $('#limitMapExtentDiv').hide();
        }
      },

      onAttributeLayerExpressionChange: function (newValue) {
        this.expressIndex = newValue;
        var valuesObj = lang.clone(this.config.layers[this.AttributeLayerIndex].expressions.expression[newValue].values.value);
        html.empty(this.textsearchlabel);
        if(this.config.layers[this.AttributeLayerIndex].expressions.expression[newValue].textsearchlabel !== ""){
          html.place(html.toDom(this.config.layers[this.AttributeLayerIndex].expressions.expression[newValue].textsearchlabel), this.textsearchlabel);
          html.style(this.textsearchlabel, 'display', 'block');
        }else{
          html.style(this.textsearchlabel, 'display', 'none');
        }
        this.paramsDijit.clear();
        this.paramsDijit.build(valuesObj, this.resultLayers[this.AttributeLayerIndex], this.config.layers[this.AttributeLayerIndex].url,
                               this.config.layers[this.AttributeLayerIndex].definitionexpression);
        this.paramsDijit.setFocusOnFirstParam();
      },

      _initBufferUnits: function () {
        if(this.config.bufferDefaults.maxBufferValue){
          this.txtBufferValue.constraints.max = this.config.bufferDefaults.maxBufferValue;
          //this.txtBufferValueSpat.constraints.max = this.config.bufferDefaults.maxBufferValue;
        }

        var options = [];
        var len = this.config.bufferDefaults.bufferUnits.bufferUnit.length;
        for (var i = 0; i < len; i++) {
          var option = {
            value: this.config.bufferDefaults.bufferUnits.bufferUnit[i].name,
            label: this.config.bufferDefaults.bufferUnits.bufferUnit[i].label
          };
          options.push(option);
          if (i === 0) {
            options[i].selected = true;
          }
        }
        this.bufferUnits.addOption(options);
        //this.bufferUnitsSpat.addOption(options);
      },

      _initSpatialRelationships: function () {
        var len = this.config.spatialrelationships.spatialrelationship.length;
        for (var i = 0; i < len; i++) {
          var iClass = this._getSpatialIconClass(this.config.spatialrelationships.spatialrelationship[i].name);
          var spatButton = html.create('div', {
            'class': 'spatial-item',
            'data-spatialtype': this.config.spatialrelationships.spatialrelationship[i].name,
            'title': this.config.spatialrelationships.spatialrelationship[i].label
          }, this.spatialItems);
          html.addClass(spatButton, iClass);
          this.own(on(spatButton, 'click', lang.hitch(this, this._spatButtonOnClick)));
        }
      },

      _spatButtonOnClick: function (event) {
        event.stopPropagation();
        this._intersectResults(event.target.getAttribute('data-spatialtype'));
      },

      _intersectResults: function (dataSpatialType) {
        this.garr = [];
        var intersectGeom;
        if (this.graphicsLayerBuffer && this.graphicsLayerBuffer.graphics.length > 0 && this.currentLayerAdded && this.currentLayerAdded.graphics.length > 0) {
          var qMessage = new Message({
            type: 'question',
            titleLabel: this.nls.spatialchoicetitle,
            message: this.nls.spatialchoicemsg,
            buttons: [{
              label: this.nls.buffergraphics,
              onClick: lang.hitch(this, lang.hitch(this, function () {
                qMessage.close();
                var g = this.graphicsLayerBuffer.graphics[0];
                intersectGeom = g.geometry;
                this.search(intersectGeom, this.spatialLayerIndex, null, null, dataSpatialType);
              }))
            }, {
              label: this.nls.selectiongraphics,
              onClick: lang.hitch(this, lang.hitch(this, function () {
                qMessage.close();
                intersectGeom = this.unionGeoms(this.currentLayerAdded.graphics);
                this.search(intersectGeom, this.spatialLayerIndex, null, null, dataSpatialType);
              }))
            }]
          });
          return;
        }
        var gra;
        if (this.graphicsLayerBuffer && this.graphicsLayerBuffer.graphics.length > 0) {
          gra = this.graphicsLayerBuffer.graphics[0];
          intersectGeom = gra.geometry;
//          console.info("spatial layer index: " + this.spatialLayerIndex);
          this.search(intersectGeom, this.spatialLayerIndex, null, null, dataSpatialType);
        } else if (this.currentLayerAdded && this.currentLayerAdded.graphics.length > 0) {
          intersectGeom = this.unionGeoms(this.currentLayerAdded.graphics);
          if (intersectGeom === Polygon && (intersectGeom.isSelfIntersecting(intersectGeom) || intersectGeom.rings.length > 1)) {
            esriConfig.defaults.geometryService.simplify([intersectGeom], lang.hitch(this,
              function (result) {
//                console.info("spatial layer index: " + this.spatialLayerIndex);
                this.search(result[0], this.spatialLayerIndex, null, null, dataSpatialType);
              }));
          } else {
//            console.info("spatial layer index: " + this.spatialLayerIndex);
            this.search(intersectGeom, this.spatialLayerIndex, null, null, dataSpatialType);
          }
        } else {
          new Message({
            titleLabel: this.nls.spatialSearchErrorTitle,
            message: this.nls.intersectMessage
          });
        }
      },

      _getSpatialIconClass: function (spatRel) {
        var iClass;
        switch (spatRel) {
        case 'esriSpatialRelContains':
          iClass = 'contain-icon';
          break;
        case 'esriSpatialRelIntersects':
          iClass = 'intersect-icon';
          break;
        case 'esriSpatialRelEnvelopeIntersects':
          iClass = 'envintersects-icon';
          break;
        case 'esriSpatialRelCrosses':
          iClass = 'crosses-icon';
          break;
        case 'esriSpatialRelIndexIntersects':
          iClass = 'indexintersects-icon';
          break;
        case 'esriSpatialRelOverlaps':
          iClass = 'overlaps-icon';
          break;
        case 'esriSpatialRelTouches':
          iClass = 'touches-icon';
          break;
        case 'esriSpatialRelWithin':
          iClass = 'within-icon';
          break;
        default:
          iClass = 'contain-icon';
        }
        return iClass;
      },

      _initTabContainer: function () {
        if (this.config.hasOwnProperty('disabledtabs')) {
          this.disabledTabs = this.config.disabledtabs;
        } else {
          this.disabledTabs = [];
        }
        this.limitMapExtentCbx.setValue(this.config.limitsearch2mapextentchecked || false);
        this.eLocateEnabled = this.config.graphicalsearchoptions.enableeLocateselect || false;
        this.txtBufferValue.set('value', this.config.bufferDefaults.bufferDefaultValue || 2);
        //this.txtBufferValueSpat.set('value', this.config.bufferDefaults.bufferDefaultValue || 2);
        this.bufferWKID = this.config.bufferDefaults.bufferWKID;
        this.autozoomtoresults = this.config.autozoomtoresults || false;
        this.mouseovergraphics = this.config.mouseovergraphics || false;
        var initView = this.config.initialView || "text";
        this.pointSearchTolerance = this.config.graphicalsearchoptions.toleranceforpointgraphicalselection || 6;
        this.cbxAddTolerance.setValue(this.config.graphicalsearchoptions.addpointtolerancechecked || false);
        this.cbxMultiGraphic.setValue(this.config.graphicalsearchoptions.multipartgraphicsearchchecked || false);
        this.cbxBufferGraphic.setValue(false);
        if (this.config.graphicalsearchoptions.showmultigraphicsgraphicaloption) {
          html.setStyle(this.multiGraDiv, 'display', '');
        } else {
          html.setStyle(this.multiGraDiv, 'display', 'none');
        }
        if (this.config.graphicalsearchoptions.showaddtolerancegraphicaloption) {
          html.setStyle(this.addToleranceDiv, 'display', '');
        } else {
          html.setStyle(this.addToleranceDiv, 'display', 'none');
        }
        if (this.config.graphicalsearchoptions.showaddsqltextgraphicaloption) {
          html.setStyle(this.addSqlTextDiv, 'display', '');
        } else {
          html.setStyle(this.addSqlTextDiv, 'display', 'none');
        }
        if (this.config.graphicalsearchoptions.showbuffergraphicaloption) {
          html.setStyle(this.bufferGraDiv, 'display', '');
        } else {
          html.setStyle(this.bufferGraDiv, 'display', 'none');
        }
        this.cbxBufferGraphic.setValue(this.config.graphicalsearchoptions.buffercheckedbydefaultgraphicaloption);

        this.cbxMultiGraphic.onChange = lang.hitch(this, this._onCbxMultiGraphicClicked);

        array.map(this.disabledTabs, lang.hitch(this, function (dTab) {
          if (dTab === 'graphic') {
            this.shapeTab = false;
          }
          if (dTab === 'text') {
            this.attribTab = false;
          }
          if (dTab === 'spatial') {
            this.spatTab = false;
          }
          if (dTab === 'result') {
            this.rsltsTab = false;
          }
        }));

        //determine if this layer has any expressions
        if(this.config.layers[0].expressions.expression.length > 0){
          this.cbxAddTextQuery.setStatus(true);
        }else{
          this.cbxAddTextQuery.setStatus(false);
        }

        if (this.cbxMultiGraphic.getValue()) {
          html.setStyle(this.btnGraSearch, 'display', 'inline-block');
        } else {
          html.setStyle(this.btnGraSearch, 'display', 'none');
        }
        var len = this.config.layers.length;
        if (initView === "text" && this.attribTab) {
          this.selTab = this.nls.selectByAttribute;
        } else if (initView === "graphical" && this.shapeTab) {
          this.selTab = this.nls.selectFeatures;
        }
        if(this.autoactivatedtool){
          this.drawBox.activate(this.autoactivatedtool.toUpperCase());
        }
        var tabs = [];
        if (this.shapeTab) {
          tabs.push({
            title: this.nls.selectFeatures,
            content: this.tabNode1
          });
          html.replaceClass(this.tabNode1, 'search-tab-node', 'search-tab-node-hidden');
        }
        if (this.attribTab) {
          for (var a = 0; a < len; a++) {
            if (this.config.layers[a].expressions.expression.length > 0) {
              tabs.push({
                title: this.nls.selectByAttribute,
                content: this.tabNode2
              });
              html.replaceClass(this.tabNode2, 'search-tab-node', 'search-tab-node-hidden');
              break;
            }
          }
        }
        if (this.spatTab) {
          for (var i = 0; i < len; i++) {
            if (this.config.layers[i].spatialsearchlayer) {
              tabs.push({
                title: this.nls.selectSpatial,
                content: this.tabNode3
              });
              html.replaceClass(this.tabNode3, 'search-tab-node', 'search-tab-node-hidden');
              break;
            }
          }
        }
        if (this.fieldTab) {
          tabs.push({
            title: this.nls.selectFields,
            content: this.tabNode5
          });
          html.replaceClass(this.tabNode5, 'search-tab-node', 'search-tab-node-hidden');
        }
        if (this.rsltsTab) {
          tabs.push({
            title: this.nls.results,
            content: this.tabNode4
          });
          html.replaceClass(this.tabNode4, 'search-tab-node', 'search-tab-node-hidden');
        }
        this.tabContainer = new TabContainer({
          tabs: tabs,
          selected: this.selTab
        }, this.tabSearch);

        this.tabContainer.startup();
        this.own(on(this.tabContainer, "tabChanged", lang.hitch(this, function (title) {
          if(title.toUpperCase().search('SEARCH')>-1){
            //set to samples
            //this.selectLayerAttribute.set('value', 0);
          }
          if (title !== this.nls.results) {
            this.selTab = title;
          }
          if(title === this.nls.selectFeatures) {
            if(this.autoactivatedtool){
              this.drawBox.activate(this.autoactivatedtool.toUpperCase());
            }
          }else{
            if (title === this.nls.selectByAttribute || title === this.nls.selectSpatial || title === this.nls.selectFields) {
              this.drawBox.deactivate();
            }else if(title === this.nls.results && !this.keepgraphicalsearchenabled) {
              this.drawBox.deactivate();
            }
          }
        })));
        jimuUtils.setVerticalCenter(this.tabContainer.domNode);
      },

      _getSumFields: function(index) {
        this.sumFields = [];
        array.map(this.config.layers[index].fields.field, lang.hitch(this,function(field){
          if(field.sumfield){
            this.sumFields.push({field: field.name, sumlabel: field.sumlabel});
          }
        }));
      },

      _initLayerSelect: function () {
        this.serviceFailureNames = [];
        if(!this.currentFeatures){
          this.currentFeatures = [];
        }
        var options = [];
        var spatialOptions = [];
        var attribOptions = [];
        var len = this.config.layers.length;
        for (var i = 0; i < len; i++) {
          var option = {
            value: i,
            label: this.config.layers[i].name
          };
          options.push(option);
          if (this.config.layers[i].spatialsearchlayer) {
            spatialOptions.push(option);
          }
          if(this.config.layers[i].expressions.expression.length > 0){
            attribOptions.push(option);
          }
        }
        //select the first layer in the lists
        if (options.length > 0) {
          options[0].selected = true;
        }
        if (spatialOptions.length > 0) {
          spatialOptions[0].selected = true;
        }
        if (attribOptions.length > 0) {
          attribOptions[0].selected = true;
        }else{
          html.setStyle(this.addSqlTextDiv, 'display', 'none');
        }

        if (len > 0) {
          /*this.paramsDijit = new Parameters({
            nls: this.nls,
            layerUniqueCache: this.layerUniqueCache,
            disableuvcache: this.config.disableuvcache,
            selectFilterType: this.config.selectfilter
          });
          this.paramsDijit.placeAt(this.parametersDiv);
          this.paramsDijit.startup();
          this.paramsDijit.on('enter-pressed', lang.hitch(this, function () {
            this.search(null, this.AttributeLayerIndex, this.expressIndex);
          }));*/
          //this.shelter.show();

          var defs = array.map(this.config.layers, lang.hitch(this, function (layerConfig) {
            return this._getLayerInfoWithRelationships(layerConfig.url);
          }));

          all(defs).then(lang.hitch(this, function (results) {
            //this.shelter.hide();
            array.forEach(results, lang.hitch(this, function (result, j) {
              if(result.state === 'success'){
                var layerInfo = result.value;
                //console.info(layerInfo);
                var layerConfig = this.config.layers[j];

                if (layerInfo.objectIdField) {
                  layerConfig.objectIdField = layerInfo.objectIdField;
                } else {
                  var fields = layerInfo.fields;
                  var oidFieldInfos = array.filter(fields, lang.hitch(this, function (fieldInfo) {
                    return fieldInfo.type === 'esriFieldTypeOID';
                  }));
                  if (oidFieldInfos.length > 0) {
                    var oidFieldInfo = oidFieldInfos[0];
                    layerConfig.objectIdField = oidFieldInfo.name;
                  }
                }
                layerConfig.existObjectId = array.some(layerConfig.fields.field, lang.hitch(this, function (element) {
                  return element.name === layerConfig.objectIdField;
                }));
                layerConfig.typeIdField = layerInfo.typeIdField;
                //ImageServiceLayer doesn't have drawingInfo
                if (!layerInfo.drawingInfo) {
                  layerInfo.drawingInfo = {};
                }
                layerInfo.name = this.nls.search + ' ' + this.nls.resultsWord + ': ' + layerConfig.name;
                layerInfo._titleForLegend = layerInfo.name;
                layerInfo.minScale = 0;
                layerInfo.maxScale = 0;
                layerInfo.effectiveMinScale = 0;
                layerInfo.effectiveMaxScale = 0;
                layerInfo.defaultVisibility = true;
                this.resultLayers.push(layerInfo);
              }else{
                //remove this layer from the options list
                var oIndex = -1;
                array.some(options, lang.hitch(this, function(option,o){
                  if(option.label === this.config.layers[j].name){
                    oIndex = o;
                    return true;
                  }
                  return false;
                }));
                options.splice(oIndex, 1);
                if (this.config.layers[j].spatialsearchlayer) {
                  spatialOptions.splice(spatialOptions.indexOf(this.config.layers[j].spatialsearchlayer), 1);
                }
                this.serviceFailureNames.push(this.config.layers[j].name);
                this.resultLayers.push({});
              }
            }));
            setTimeout(lang.hitch(this, function(){
              if(options.length === 1){
                this.labelLayerGraphical.innerHTML = options[0].label;
                html.setStyle(dojoQuery(".esearch-select-graphic")[0], 'display', 'none');
                html.removeClass(this.labelLayerGraphical, 'hidden');
              }else{
                this.selectLayerGraphical.addOption(spatialOptions);
              }
              if(attribOptions.length === 1){
                this.labelLayerAttribute.innerHTML = attribOptions[0].label;
                html.setStyle(dojoQuery(".esearch-select-attrib")[0], 'display', 'none');
                html.removeClass(this.labelLayerAttribute, 'hidden');
              }else{
                this.selectLayerAttribute.addOption(attribOptions);
              }
              if(spatialOptions.length === 1){
                this.labelLayerSpatial.innerHTML = spatialOptions[0].label;
                html.setStyle(dojoQuery(".select-layer-spatial")[0], 'display', 'none');
                html.removeClass(this.labelLayerSpatial, 'hidden');
              }else{
                //this.selectLayerSpatial.addOption(spatialOptions);
              }

              //delay to be sure all dropdowns are created
              this.populateAllDropDowns();
            }), 100);

            if(spatialOptions.length > 0){
              this.spatialLayerIndex = spatialOptions[0].value;
            }

            //now check if there is a url search to do
            var myObject = this.getUrlParams();
            if (myObject.esearch) {
              if(myObject.esearch === "last48"){
                var today = new Date();
                var priorDate = new Date(today.getTime() - (((24 * 60 * 60 * 1000) - 1000) * 2));
                var priorDateStr = this._formatDate(priorDate.getTime(), 'yyyy/MM/dd');
                myObject.esearch = priorDateStr + "~" + this._formatDate(new Date().getTime(), 'yyyy/MM/dd');
              }
              if(myObject.esearch === "thismonth"){
                var today = new Date();
                today.setDate(1);
                var thisMonthStr = this._formatDate(today.getTime(), 'yyyy/MM/dd');
                myObject.esearch = thisMonthStr + "~" + this._formatDate(new Date().getTime(), 'yyyy/MM/dd');
              }
              if(myObject.esearch === "thisyear"){
                var today = new Date();
                today.setMonth(0,1);
                var thisMonthStr = this._formatDate(today.getTime(), 'yyyy/MM/dd');
                myObject.esearch = thisMonthStr + "~" + this._formatDate(new Date().getTime(), 'yyyy/MM/dd');
              }
              if(this.config.layers[myObject.slayer].expressions.expression.length > 0){
                var valuesObj1 = lang.clone(this.config.layers[myObject.slayer].expressions.expression[myObject.exprnum || 0].values.value);
                var values = myObject.esearch.split("|");
                array.forEach(values, lang.hitch(this, function(val, index){
                  if (val.indexOf('~') > -1){
                    var ranges = val.split("~");
                    valuesObj1[index].valueObj.value1 = ranges[0];
                    valuesObj1[index].valueObj.value2 = ranges[1];
                  }else{
                    valuesObj1[index].valueObj.value = val;
                  }
                }));
                html.empty(this.textsearchlabel);
                if(this.config.layers[myObject.slayer].expressions.expression[myObject.exprnum || 0].textsearchlabel !== ""){
                  html.place(html.toDom(this.config.layers[myObject.slayer].expressions.expression[myObject.exprnum || 0].textsearchlabel), this.textsearchlabel);
                  html.style(this.textsearchlabel, 'display', 'block');
                }else{
                  html.style(this.textsearchlabel, 'display', 'none');
                }
                this.paramsDijit.build(valuesObj1, this.resultLayers[myObject.slayer], this.config.layers[myObject.slayer].url,
                                     this.config.layers[myObject.slayer].definitionexpression);
                on.once(this.paramsDijit, 'param-ready', lang.hitch(this, function () {
                  this._queryFromURL(myObject.esearch, myObject.slayer, myObject.exprnum || 0, myObject.close || false, attribOptions.length);
                }));
              }
            } else {
              //init the first available attrib layers paramsDijit
              if(attribOptions.length > 0){
                var aIndex = attribOptions[0].value;
                this.AttributeLayerIndex = aIndex;
                /*this._initSelectedLayerExpressions();
                if(this.config.layers[aIndex].expressions.expression.length > 0){
                  var valuesObj = lang.clone(this.config.layers[aIndex].expressions.expression[0].values.value);
                  html.empty(this.textsearchlabel);
                  if(this.config.layers[aIndex].expressions.expression[0].textsearchlabel !== ""){
                    html.place(html.toDom(this.config.layers[aIndex].expressions.expression[0].textsearchlabel), this.textsearchlabel);
                    html.style(this.textsearchlabel, 'display', 'block');
                  }else{
                    html.style(this.textsearchlabel, 'display', 'none');
                  }
                  this.paramsDijit.build(valuesObj, this.resultLayers[aIndex], this.config.layers[aIndex].url,
                                       this.config.layers[aIndex].definitionexpression);
                  on.once(this.paramsDijit, 'param-ready', lang.hitch(this, function () {
                    this.paramsDijit.setFocusOnFirstParam();
                  }));
                }
                //determine if this layer has any sum field(s)
                this._getSumFields(aIndex);
                if(this.sumFields.length > 0){
                  html.addClass(this.list.domNode, 'sum');
                  html.setStyle(this.divSum, 'display', '');
                }else{
                  html.removeClass(this.list.domNode, 'sum');
                  html.setStyle(this.divSum, 'display', 'none');
                }*/
              }
            }

            if(this.serviceFailureNames.length > 0){
              console.info("service failed", this.serviceFailureNames);
              new Message({
                titleLabel: this.nls.mapServiceFailureTitle,
                message: this.nls.mapServicefailureMsg + this.serviceFailureNames.join(", ") + this.nls.mapServicefailureMsg2
              });
            }
          }), lang.hitch(this, function (err) {
            this.shelter.hide();
            if(options.length === 1){
              this.labelLayerGraphical.innerHTML = options[0].label;
              html.setStyle(dojoQuery(".esearch-select-graphic")[0], 'display', 'none');
              html.removeClass(this.labelLayerGraphical, 'hidden');
            }else{
              this.selectLayerGraphical.addOption(spatialOptions);
            }
            if(attribOptions.length === 1){
              this.labelLayerAttribute.innerHTML = attribOptions[0].label;
              html.setStyle(dojoQuery(".esearch-select-attrib")[0], 'display', 'none');
              html.removeClass(this.labelLayerAttribute, 'hidden');
            }else{
              this.selectLayerAttribute.addOption(attribOptions);
            }
            if(spatialOptions.length === 1){
              this.labelLayerSpatial.innerHTML = spatialOptions[0].label;
              html.setStyle(dojoQuery(".select-layer-spatial")[0], 'display', 'none');
              html.removeClass(this.labelLayerSpatial, 'hidden');
            }else{
              //this.selectLayerSpatial.addOption(spatialOptions);
            }
            console.error(err);
            for (var j = 0; j < this.config.layers.length; j++) {
              var layer = new GraphicsLayer();
              this.resultLayers.push(layer);
            }
          }));
        }
        this.own(on(this.selectLayerGraphical, "change", lang.hitch(this, this.onGraphicalLayerChange)));
        this.own(on(this.selectLayerAttribute, "change", lang.hitch(this, this.onAttributeLayerChange)));
        //this.own(on(this.selectLayerSpatial, "change", lang.hitch(this, this.onSpatialLayerChange)));
        //this.own(on(this.selectExpression, "change", lang.hitch(this, this.onAttributeLayerExpressionChange)));
        this.own(on(this.list, 'remove', lang.hitch(this, this._removeResultItem)));
      },

      _relateResultItem: function(index, item) {
        var layerConfig = this.config.layers[this.currentLayerIndex];
        var oidField = layerConfig.objectIdField;
        if(!item){
          return;
        }
        var sResult = item;
        this.relArray = [];
        for(var r=0; r < layerConfig.relates.relate.length; r++){
          var relRslt = {
            id: layerConfig.relates.relate[r].id,
            name: layerConfig.relates.relate[r].label,
            fields: layerConfig.relates.relate[r].fields,
            oid: sResult.graphic.attributes[oidField]
          };
          this.relArray.push(relRslt);
        }

        if (this.wManager) {
          var widgetCfg = this._getWidgetConfig('AttributeTable');
          if(widgetCfg){
            var attWidget = this.wManager.getWidgetByLabel(widgetCfg.label);
            if(attWidget){
              this.attTableOpenedbySearch = !attWidget.showing;
              this.wManager.openWidget(attWidget);
              if(this.relArray.length === 1){
                this._createLayerAndExecuteQuery(0);
              }else{
                var rc = new RelateChooser({
                  relatesArr: this.relArray,
                  autoHeight: true,
                  width: 400,
                  titleLabel: this.nls.chooserelate,
                  folderurl: this.folderUrl
                });
                on(rc, "click", lang.hitch(this, function(evt){
                  this._createLayerAndExecuteQuery(evt);
                }));
              }
            }
          }
        }
      },

      _createLayerAndExecuteQuery: function(relateId) {
        var layerConfig = this.config.layers[this.currentLayerIndex];
        this._createRelateResultLayer(relateId).then(lang.hitch(this, function(result){
          var relateFL = result.value;
          this._addRelateLayer(relateFL);
          var relQuery = new RelationshipQuery();
          relQuery.outSpatialReference = this.map.spatialReference;
          if(this.relArray[relateId].fields.all){
            relQuery.outFields = ["*"];
          }else{
            var outFields = array.map(this.relArray[relateId].fields.field, lang.hitch(this, function (fieldInfo) {
              return fieldInfo.name;
            }));
            relQuery.outFields = outFields;
          }
          relQuery.relationshipId = parseInt(relateId);
          relQuery.objectIds = [this.relArray[relateId].oid];
          relQuery.returnGeometry = true;
          var queryTask = new QueryTask(layerConfig.url);
          queryTask.executeRelationshipQuery(relQuery, lang.hitch(this, this._onRelSearchFinish, this.relArray[relateId].oid, relateId));
        }));
      },

      _onRelSearchFinish: function (oid, relateId, result) {
        var layerConfig = this.config.layers[this.currentLayerIndex];
        // console.info(oid, relateId, result);
        if(!result[oid]){
          this.map.removeLayer(this._relateLyr);
          this.relateLayers.splice(this.relateLayers.length - 1, 1);
          new Message({
            titleLabel: this.nls.noResults,
            message: this.nls.noRelatedRecords + " " + layerConfig.relates.relate[relateId].label
          });
          return;
        }
        this._relateLyr.applyEdits(result[oid].features);
        var layerInfo = this.operLayerInfos.getLayerInfoById(this._relateLyr.id);
        //Adjust field info based on config
        if(!layerConfig.relates.relate[relateId].fields.all){
          var adjRelFldInfos = [];
          array.map(layerInfo.layerObject.fields, lang.hitch(this, function (fieldInfo){
            var cnfgFldObj = this._getRelateConfigFieldObject(fieldInfo.name, this.currentLayerIndex, relateId);
            if(cnfgFldObj){
              adjRelFldInfos.push({
                fieldName: cnfgFldObj.name,
                label: cnfgFldObj.alias,
                show: true,
                format: this._convertFormatInfo(cnfgFldObj)
              });
            }
          }));
          layerInfo.originOperLayer.popupInfo = {
            fieldInfos: adjRelFldInfos
          }
        }

        this.publishData({
          'target': 'AttributeTable',
          'layer': layerInfo
        });
      },

      _createRelateResultLayer: function (relateId) {
        var def = new Deferred();
        var relLyrExists = false;
        var layerConfig = this.config.layers[this.currentLayerIndex];
        //Check if the layer already exists
        if(this.relateLayers && this.relateLayers.length > 0){
          array.some(this.relateLayers, lang.hitch(this, function(rLayer){
            if(rLayer.name === this.nls.relate + ': ' + layerConfig.relates.relate[relateId].label){
              this._relateLyr = rLayer;
              def.resolve({state: 'success', value: rLayer});
              relLyrExists = true;
              return true;
            }
          }));
        }
        if(!relLyrExists){
          var serviceUrl = this._getServiceUrlByLayerUrl(layerConfig.url);
          relateLyrUrl = serviceUrl + '/' + relateId
          this._getLayerInfoWithRelationships(relateLyrUrl).then(lang.hitch(this, function(result){
            var layerInfo = result.value;
            layerInfo.name = this.nls.relate + ': ' + layerConfig.relates.relate[relateId].label;
            layerInfo._titleForLegend = layerInfo.name;
            layerInfo.minScale = 0;
            layerInfo.maxScale = 0;
            layerInfo.effectiveMinScale = 0;
            layerInfo.effectiveMaxScale = 0;
            layerInfo.defaultVisibility = true;

            //only keep necessary fields
            var necessaryFieldNames = array.map(layerConfig.relates.relate[relateId].fields.field, lang.hitch(this, function (fieldInfo) {
              return fieldInfo.name;
            }));

            var oidField;
            if (layerInfo.objectIdField) {
              oidField = layerInfo.objectIdField;
            } else {
              var fields = layerInfo.fields;
              var oidFieldInfos = array.filter(fields, lang.hitch(this, function (fieldInfo) {
                return fieldInfo.type === 'esriFieldTypeOID';
              }));
              if (oidFieldInfos.length > 0) {
                var oidFieldInfo = oidFieldInfos[0];
                oidField = oidFieldInfo.name;
              }
            }
            if (array.indexOf(necessaryFieldNames, oidField) < 0) {
              necessaryFieldNames.push(oidField);
            }
            //match field order with order specified in relate config.
            if(!layerConfig.relates.relate[relateId].fields.all){
              var adjFieldsOrder = [];
              array.map(layerConfig.relates.relate[relateId].fields.field, lang.hitch(this, function (fieldInfo) {
                array.some(layerInfo.fields, lang.hitch(this, function (oFieldInfo) {
                  if(oFieldInfo.name === fieldInfo.name){
                    adjFieldsOrder.push(oFieldInfo);
                    return true;
                  }
                }));
              }));
              layerInfo.fields = adjFieldsOrder;
            }

            layerInfo.fields = array.filter(layerInfo.fields, lang.hitch(this, function (fieldInfo) {
              if(!layerConfig.relates.relate[relateId].fields.all){
                return necessaryFieldNames.indexOf(fieldInfo.name) >= 0;
              }else{
                return true;
              }
            }));
            /*Adjust field aliases to those configured in the json*/
            array.map(layerInfo.fields, lang.hitch(this, function (fieldInfo){
              if(necessaryFieldNames.indexOf(fieldInfo.name) >= 0){
                var cnfgFldObj = this._getRelateConfigFieldObject(fieldInfo.name, this.currentLayerIndex, relateId);
                if(cnfgFldObj && cnfgFldObj.alias !== fieldInfo.alias){
                  fieldInfo.alias = cnfgFldObj.alias;
                }
              }
            }));

            var featureCollection = {
              layerDefinition: layerInfo,
              featureSet: null
            };
            resultLayer = new FeatureLayer(featureCollection);
            this._relateLyr = resultLayer;
            def.resolve({state: 'success', value: resultLayer});
          }));
        }
        return def;
      },

      _removeResultItem: function (index, item) {
        //console.info(item);
        array.some(this.currentCSVResults.data, lang.hitch(this, function(csvRow){
          if(csvRow.OID === item.OID){
            this.currentCSVResults.data.splice(this.currentCSVResults.data.indexOf(csvRow), 1);
            return true;
          }
          return false;
        }));
        var sResult = item;
        var layerConfig = this.config.layers[this.currentLayerIndex];
        this.currentFeatures.splice(this.currentFeatures.indexOf(sResult.graphic), 1);
        if(this.currentFeatures.length === 0){
          //this.clear();
          if (this.isSelTabVisible()) {
            this.tabContainer.selectTab(this.selTab);
          }
          return;
        }
        this.currentSearchLayer.remove(sResult.graphic);
        this.currentSearchLayer.refresh();
        html.empty(this.divResultMessage);
        html.place(html.toDom("<label>" + this.nls.featuresSelected + this.currentFeatures.length + "</label>"), this.divResultMessage);
        this.list.remove(index);
        this._hideInfoWindow();
        if (layerConfig.shareResult && layerConfig.addToAttrib) {
          if (this.wManager) {
            var widgetCfg = this._getWidgetConfig('AttributeTable');
            if(widgetCfg){
              var attWidget = this.wManager.getWidgetByLabel(widgetCfg.label);
              if(attWidget){
                this.attTableOpenedbySearch = !attWidget.showing;
                this.wManager.openWidget(attWidget);
                attWidget._activeTable.refresh();
              }
            }
          }
        }
      },

      _getServiceUrlByLayerUrl: function (layerUrl) {
        var lastIndex = layerUrl.lastIndexOf("/");
        var serviceUrl = layerUrl.slice(0, lastIndex);
        return serviceUrl;
      },

      _isServiceSupportsOrderBy: function(layerInfo){
        var isSupport = false;
        if(layerInfo.advancedQueryCapabilities){
          if(layerInfo.advancedQueryCapabilities.supportsOrderBy){
            isSupport = true;
          }
        }
        return isSupport;
      },

      _getLayerInfoWithRelationships: function (layerUrl) {
        var def = new Deferred();
        esriRequest({
          url: layerUrl,
          content: {
            f: 'json'
          },
          handleAs: 'json',
          callbackParamName: 'callback'
        }).then(lang.hitch(this, function (layerInfo) {
          if (!layerInfo.relationships) {
            layerInfo.relationships = [];
          }
          layerInfo._origLayerURL = layerUrl;
          var serviceUrl = this._getServiceUrlByLayerUrl(layerUrl);
          layerInfo._origServiceURL = serviceUrl
          var defs = array.map(layerInfo.relationships, lang.hitch(this, function (relationship) {
            return esriRequest({
              url: serviceUrl + '/' + relationship.relatedTableId,
              content: {
                f: 'json'
              },
              handleAs: 'json',
              callbackParamName: 'callback'
            });
          }));
          all(defs).then(lang.hitch(this, function (results) {
            array.forEach(results, lang.hitch(this, function (relationshipInfo, index) {
              var relationship = layerInfo.relationships[index];
              relationship.name = relationshipInfo.name;
              //ignore shape field
              relationship.fields = array.filter(relationshipInfo.fields,
                lang.hitch(this, function (relationshipFieldInfo) {
                  return relationshipFieldInfo.type !== 'esriFieldTypeGeometry';
                }));
            }));
            def.resolve({state: 'success', value: layerInfo});
          }), lang.hitch(this, function (err) {
            def.resolve({state: 'failure', value: err});
          }));
          def.resolve({state: 'success', value: layerInfo});
        }), lang.hitch(this, function (err) {
          def.resolve({state: 'failure', value: err});
        }));
        return def;
      },

      _queryFromURL: function (value, slayerId, exprNum, close, numOfAttribLayers) {
        slayerId = typeof slayerId !== 'undefined' ? slayerId : 0;
        exprNum = typeof exprNum !== 'undefined' ? exprNum : 0;
        this.AttributeLayerIndex = slayerId;
        this.expressIndex = exprNum;
//make sure the form reflects what was searched
        if(numOfAttribLayers > 1){
          //this.selectLayerAttribute.set('value', slayerId);
        }
        setTimeout(lang.hitch(this, function(){
          this.selectExpression.set('value', exprNum || 0);
          setTimeout(lang.hitch(this, function(){
            var valuesObj = lang.clone(this.config.layers[slayerId].expressions.expression[exprNum || 0].values.value);
            this.paramsDijit.setSingleParamValues(valuesObj, value);
          }), 200);
        }), 200);

        var valsArr = this._buildSearchValues(value);
        //determine if this layer has any sum field(s)
        this._getSumFields(slayerId);
        if(this.sumFields.length > 0){
          html.addClass(this.list.domNode, 'sum');
          html.setStyle(this.divSum, 'display', '');
        }else{
          html.removeClass(this.list, 'sum');
          html.setStyle(this.divSum, 'display', 'none');
        }
        this.search(null, slayerId, exprNum, valsArr, null, close);
      },

      _createSearchResultLayer: function (layerIndex) {
        var resultLayer = null;
        var layerConfig = this.config.layers[layerIndex];
        var layerInfo = lang.clone(this.resultLayers[layerIndex]);
        var _hasInfoTemplate = false;
        var _infoTemplate = null;
        var _popupNeedFields = [];

        //now setup the infoTemplate
        //check if this layer is part of map and if it has a popup defined already
        var lyrDisablePopupsAndTrue = (layerConfig.hasOwnProperty("disablePopups") && layerConfig.disablePopups)?true:false;
        if(!this.config.disablePopups && !lyrDisablePopupsAndTrue){
          if(layerConfig.popupfrom && layerConfig.popupfrom === "webmap"){
            array.forEach(this.operLayerInfos.getLayerInfoArray(), function(layerInfo2) {
              //console.info(layerInfo2);
              if(layerInfo2.layerObject && layerInfo2.layerObject.url === layerInfo._origServiceURL || layerInfo2.layerObject.url === layerInfo._origLayerURL){
                //console.info(layerInfo2);
                if(layerInfo2.controlPopupInfo.hasOwnProperty("infoTemplates")){
                  if(layerInfo2.controlPopupInfo.infoTemplates[layerInfo.id]){
                    //console.info(layerInfo2.controlPopupInfo.infoTemplates[layerInfo.id].infoTemplate);
                    if(layerInfo2.controlPopupInfo.infoTemplates[layerInfo.id].infoTemplate._fieldLabels){
                      _popupNeedFields = this._addPopupFields(layerInfo2.controlPopupInfo.infoTemplates[layerInfo.id].infoTemplate._fieldLabels);
                    }
                    _infoTemplate = layerInfo2.controlPopupInfo.infoTemplates[layerInfo.id].infoTemplate;
                    _hasInfoTemplate = true;
                  }else{
                    _hasInfoTemplate = false;
                  }
                }else{
                  if(layerInfo2.controlPopupInfo.infoTemplate._fieldLabels){
                    _popupNeedFields = this._addPopupFields(layerInfo2.controlPopupInfo.infoTemplate._fieldLabels);
                  }
                  _infoTemplate = layerInfo2.controlPopupInfo.infoTemplate;
                  _hasInfoTemplate = true;
                }
              }
            }, this);
          }else{
            _hasInfoTemplate = false;
          }
        }

        if (layerConfig.shareResult) {
          //only keep necessary fields
          var necessaryFieldNames = this._getOutputFields(layerIndex, _popupNeedFields);
          layerInfo.fields = array.filter(layerInfo.fields, lang.hitch(this, function (fieldInfo) {
            if(!layerConfig.fields.all){
              return necessaryFieldNames.indexOf(fieldInfo.name) >= 0;
            }else{
              return true;
            }
          }));
/*Adjust field aliases to those configured in the json*/
          array.map(layerInfo.fields, lang.hitch(this, function (fieldInfo){
            if(necessaryFieldNames.indexOf(fieldInfo.name) >= 0){
              var cnfgFldObj = this._getConfigFieldObject(fieldInfo.name, layerIndex);
              if(cnfgFldObj && cnfgFldObj.alias !== fieldInfo.alias){
                fieldInfo.alias = cnfgFldObj.alias;
              }
            }
          }));
          var featureCollection = {
            layerDefinition: layerInfo,
            featureSet: null
          };
          resultLayer = new FeatureLayer(featureCollection);
        } else {
          //use graphics layer
          this._resetAndAddTempResultLayer(layerIndex);
          resultLayer = this.tempResultLayer;
        }
        if(_hasInfoTemplate){
          resultLayer._hasInfoTemplate = true;
          resultLayer.infoTemplate = _infoTemplate;
        }else{
          resultLayer._hasInfoTemplate = false;
        }
        return resultLayer;
      },

      _addPopupFields: function(fields) {
        var popFldArr = [];
        for(var fld in fields){
          popFldArr.push(fields[fld]);
        }
        return popFldArr;
      },

      _getConfigFieldObject: function (fldName, layerIndex) {
//        console.info(fldName, layerIndex);
        var layerConfig = this.config.layers[layerIndex];
        var fields = layerConfig.fields.field;
        var retFldObj = null;
        array.some(fields, lang.hitch(this, function (fieldInfo) {
          if(fieldInfo.name === fldName){
            retFldObj = fieldInfo;
            return true;
          }else{
            return false;
          }
        }));
        return retFldObj;
      },

      _getRelateConfigFieldObject: function (fldName, layerIndex, relateId) {
//        console.info(fldName, layerIndex, relateId);
        var layerConfig = this.config.layers[layerIndex].relates.relate[relateId];
        var fields = layerConfig.fields.field;
        var retFldObj = null;
        array.some(fields, lang.hitch(this, function (fieldInfo) {
          if(fieldInfo.name === fldName){
            retFldObj = fieldInfo;
            return true;
          }else{
            return false;
          }
        }));
        return retFldObj;
      },

      _getOutputFields: function (layerIndex, popupFieldName) {
        var layerConfig = this.config.layers[layerIndex];
        var fields = layerConfig.fields.field;
        var outFields = array.map(fields, lang.hitch(this, function (fieldInfo) {
          return fieldInfo.name;
        }));
        //we need to add objectIdField into outFields because relationship query
        //needs objectId infomation
        var objectIdField = layerConfig.objectIdField;
        if (array.indexOf(outFields, objectIdField) < 0) {
          outFields.push(objectIdField);
        }

        //Make sure the title field is added to the fields array
        var title = layerConfig.titlefield;
        if (array.indexOf(outFields, title) < 0) {
          outFields.push(title);
        }

        var allFieldInfos = this.resultLayers[layerIndex].fields;
        var allFieldNames = array.map(allFieldInfos, lang.hitch(this, function (fieldInfo) {
          return fieldInfo.name;
        }));
        //make sure every fieldName of outFields exists in fieldInfo
        outFields = array.filter(outFields, lang.hitch(this, function (fieldName) {
          return allFieldNames.indexOf(fieldName) >= 0;
        }));
        //make sure every popupfield is added
        array.map(popupFieldName, lang.hitch(this, function(fldname){
          if (array.indexOf(outFields, fldname) < 0) {
            outFields.push(fldname);
            //console.info("Added popup field: " + fldname);
          }
        }));
        if(layerConfig.fields.all){
          outFields = allFieldNames;
        }
        //console.info(outFields);
        return outFields;
      },

      _bufferGeometries: function (geomArr, sr, dist, unit, isGraphicalBufferOp) {
        if (geomArr) {
          var bufferParameters = new BufferParameters();
          var resultEvent;
          bufferParameters.geometries = geomArr;
          bufferParameters.bufferSpatialReference = sr;
          bufferParameters.unit = GeometryService[unit];
          bufferParameters.distances = dist;
          bufferParameters.unionResults = true;
          bufferParameters.geodesic = true;
          bufferParameters.outSpatialReference = this.map.spatialReference;
          esriConfig.defaults.geometryService.buffer(bufferParameters, lang.hitch(this, function (evt) {
            resultEvent = evt[0];
            var graphic = new Graphic();
            graphic.geometry = resultEvent;
            graphic.symbol = new SimpleFillSymbol(this.config.bufferDefaults.simplefillsymbol);

            this.graphicsLayerBuffer.clear();
            this.graphicsLayerBuffer.add(graphic);
            html.setStyle(this.btnClearBuffer2, 'display', 'block');
            if (isGraphicalBufferOp) {
              this.search(resultEvent, this.graphicLayerIndex);
            }
          }));
        }
      },

      _buildSearchValues: function (value) {
        var valArray = [];
        var values = value.split("|");
        array.forEach(values, lang.hitch(this, function (val) {
          var retValueObj = {};
          if (val.indexOf('~') > -1) {
            var ranges = val.split("~");
            retValueObj.value1 = ranges[0];
            retValueObj.value2 = ranges[1];
          } else {
            retValueObj.value = val;
          }
          valArray.push(retValueObj);
        }));
        return valArray;
      },

      getUrlParams: function () {
        var s = window.location.search,
          p;
        if (s === '') {
          return {};
        }
        p = ioquery.queryToObject(s.substr(1));
        return p;
      },

      _initProgressBar: function () {
        this.progressBar = new ProgressBar({
          indeterminate: true
        }, this.progressbar);
        html.setStyle(this.progressBar.domNode, 'display', 'none');
      },

      _initSelectedLayerExpressions: function () {
        this.selectExpression.removeOption(this.selectExpression.getOptions());
        var express = [];
        //now loop through the expressions
        var elen = this.config.layers[this.AttributeLayerIndex].expressions.expression.length;
        for (var e = 0; e < elen; e++) {
          var eoption = {
            value: e,
            label: this.config.layers[this.AttributeLayerIndex].expressions.expression[e].alias
          };
          express.push(eoption);
          if (e === 0) {
            express[e].selected = true;
          }
        }
        this.selectExpression.addOption(express);
        if (elen === 1) {
          domUtils.hide(this.expressionDiv);
        } else {
          domUtils.show(this.expressionDiv);
        }
      },

      _initDrawBox: function () {
        this.keepgraphicalsearchenabled = this.config.graphicalsearchoptions.keepgraphicalsearchenabled || false;
        aspect.before(this.drawBox, "_activate", lang.hitch(this, function(){
          this.publishData({message: "Deactivate_DrawTool"});
        }));
        this.drawBox.setMap(this.map);
        var enabledButtons = [];
        if (this.config.graphicalsearchoptions.enablepointselect) {
          enabledButtons.push('POINT');
        }
        if (this.config.graphicalsearchoptions.enablelineselect) {
          enabledButtons.push('LINE');
        }
        if (this.config.graphicalsearchoptions.enablepolylineselect) {
          enabledButtons.push('POLYLINE');
        }
        if (this.config.graphicalsearchoptions.enableextentselect) {
          enabledButtons.push('EXTENT');
        }
        if (this.config.graphicalsearchoptions.enablecircleselect) {
          enabledButtons.push('CIRCLE');
        }
        if (this.config.graphicalsearchoptions.enableellipseselect) {
          enabledButtons.push('ELLIPSE');
        }
        if (this.config.graphicalsearchoptions.enablepolyselect) {
          enabledButtons.push('POLYGON');
        }
        this.drawBox.geoTypes = enabledButtons;
        this.drawBox._initTypes();
        if(this.keepgraphicalsearchenabled){
          this.drawBox.deactivateAfterDrawing = false;
        }
        this.own(on(this.drawBox, 'IconSelected', lang.hitch(this, function (tool, geotype, commontype) {
          if (this.lastDrawCommonType && this.lastDrawCommonType !== commontype && this.garr.length > 0) {
            var qMessage = new Message({
              type: 'question',
              titleLabel: this.nls.warning,
              message: this.nls.graphicgeomtypemsg1 + "\n\n" + this.nls.graphicgeomtypemsg2,
              buttons: [{
                label: this.nls._continue,
                onClick: lang.hitch(this, lang.hitch(this, function () {
                  qMessage.close();
                  this.lastDrawCommonType = commontype;
                  this.lastDrawTool = geotype;
                  this.drawBox.clear();
                  this.garr = [];
                }))
              }, {
                label: this.nls.cancel,
                onClick: lang.hitch(this, lang.hitch(this, function () {
                  qMessage.close();
                  this.drawBox.activate(this.lastDrawTool);
                }))
              }]
            });
          }else{
            this.lastDrawCommonType = commontype;
            this.lastDrawTool = geotype;
          }
        })));
        this.own(on(this.drawBox, 'DrawEnd', lang.hitch(this, function (graphic) {
          if (!this.cbxMultiGraphic.getValue()) {
            if (graphic.geometry.type === "point" && this.cbxAddTolerance.getValue()) {
              var ext = this.pointToExtent(graphic.geometry, this.pointSearchTolerance);
              this.search(ext, this.graphicLayerIndex);
            } else {
              if (this.cbxBufferGraphic.getValue()) {
                this._bufferGeometries([graphic.geometry], new SpatialReference({
                  wkid: this.bufferWKID
                }), [parseFloat(this.txtBufferValue.get('value'))], this.bufferUnits.get('value'), true);
              } else {
                this.search(graphic.geometry, this.graphicLayerIndex);
              }
            }
          } else {
            this.garr.push(graphic);
          }
        })));
        this.own(on(this.btnClear2, "click", lang.hitch(this, this.clear, true, true)));
        this.own(on(this.btnClear3, "click", lang.hitch(this, this.clear, true, true)));
        this.own(on(this.btnClear4, "click", lang.hitch(this, this.clearFields, true)));
        this.own(on(this.btnClearBuffer2, "click", lang.hitch(this, this.clearbuffer)));
        html.setStyle(this.btnClearBuffer2, 'display', 'none');
        html.setStyle(this.btnClear2, 'display', 'none');
        html.setStyle(this.btnClear3, 'display', 'none');
      },

      exportURL: function () {
        var useSeparator, eVal;
        var url = window.location.protocol + '//' + window.location.host + window.location.pathname;
        var urlObject = urlUtils.urlToObject(window.location.href);
        urlObject.query = urlObject.query || {};
        var content = this.paramsDijit.getSingleParamValues();
        for (var s = 0; s < content.length; s++) {
          eVal = content[s].value.toString();
        }
        urlObject.query.esearch = eVal;
        urlObject.query.slayer = this.AttributeLayerIndex.toString();
        urlObject.query.exprnum = this.expressIndex.toString();
        // each param
        for (var i in urlObject.query) {
          if (urlObject.query[i] && urlObject.query[i] !== 'config') {
            // use separator
            if (useSeparator) {
              url += '&';
            } else {
              url += '?';
              useSeparator = true;
            }
            url += i + '=' + urlObject.query[i];
          }
        }
        window.prompt(this.nls.copyurlprompt, url);
      },

      _bufferFeatures: function () {
        if (this.currentLayerAdded && this.currentLayerAdded.graphics.length > 0) {
          var geoms = array.map(this.currentLayerAdded.graphics, function (gra) {
            return gra.geometry;
          });
          this._bufferGeometries(geoms, new SpatialReference({
            wkid: this.bufferWKID
          }), [parseFloat(this.txtBufferValueSpat.get('value'))], this.bufferUnitsSpat.get('value'), false);
        } else {
          new Message({
            titleLabel: this.nls.bufferSearchErrorTitle,
            message: this.nls.bufferMessage
          });
        }
      },

      error4GP:function(error){

        that.tabContainer.selectTab(that.nls.results);
        html.empty(that.divResultMessage);
        html.place(html.toDom("An error has occured running the geoprocessing tool.  Please try again."), that.divResultMessage);
        html.setStyle(that.progressBar.domNode, 'display', 'none');

        
        new Message({
          titleLabel: "GP Error",
          message: "There was an error completing the processing, please try again or adjust your query."
        });
      },

      returnGPFile:function(result){

        if(result.jobInfo.jobStatus == "esriJobSucceeded"){

            result.target.getResultData(result.jobInfo.jobId, "output_catch_zero", function(e){
              var url = e.value.url;
              var win = window.open(url, '_blank');
              win.focus();
            });
            new Message({
                  titleLabel: "Process Successfull",
                  message: "File Downloaded."
                });
        }
        else{
            new Message({
                  titleLabel: "GP Error",
                  message: "Problem downloading data."
                });
        }
        
        that.tabContainer.selectTab(that.nls.results);
        html.setStyle(that.progressBar.domNode, 'display', 'none');        
      },

      returnGPFileTrawl:function(result){

        if(result.jobInfo.jobStatus == "esriJobSucceeded"){

            //standardlength_freq_trawl_xls  //totallength_freq_trawl_xls //forklength_freq_trawl_xls //lengthsea_freq_trawl_xls 

            /* removed per Lauren's request
            result.target.getResultData(result.jobInfo.jobId, "standardlength_freq_trawl_xls", function(e){
              var url = e;
              var win = window.open(url, '_blank');
              win.focus();
            });
            result.target.getResultData(result.jobInfo.jobId, "totallength_freq_trawl_xls", function(e){
              var url = e;
              var win = window.open(url, '_blank');
              win.focus();
            });
            result.target.getResultData(result.jobInfo.jobId, "forklength_freq_trawl_xls", function(e){
              var url = e;
              var win = window.open(url, '_blank');
              win.focus();
            });*/
            result.target.getResultData(result.jobInfo.jobId, "lengthsea_freq_trawl_xls", function(e){
              var url = e.value.url;
              var win = window.open(url, '_blank');
              win.focus();
            });

            new Message({
                  titleLabel: "Process Successfull",
                  message: "File Downloaded."
                });
        }
        else{
            new Message({
                  titleLabel: "GP Error",
                  message: "Problem downloading data."
                });
        }
        
        that.tabContainer.selectTab(that.nls.results);
        html.setStyle(that.progressBar.domNode, 'display', 'none');        
      },

      returnGPFileIchAbundance:function(result){

        if(result.jobInfo.jobStatus == "esriJobSucceeded"){

            result.target.getResultData(result.jobInfo.jobId, "Output_Table", function(e){
              var url = e.value.url;
              var win = window.open(url, '_blank');
              win.focus();
            });
            new Message({
                  titleLabel: "Process Successfull",
                  message: "File Downloaded."
                });
        }
        else{
            new Message({
                  titleLabel: "GP Error",
                  message: "Problem downloading data."
                });
        }
        
        that.tabContainer.selectTab(that.nls.results);
        html.setStyle(that.progressBar.domNode, 'display', 'none');        
      },

       returnGPFileIchFrequ:function(result){

        if(result.jobInfo.jobStatus == "esriJobSucceeded"){

            result.target.getResultData(result.jobInfo.jobId, "Output_Excel_FIle", function(e){
              var url = e.value.url;
              var win = window.open(url, '_blank');
              win.focus();
            });
            new Message({
                  titleLabel: "Process Successfull",
                  message: "File Downloaded."
                });
        }
        else{
            new Message({
                  titleLabel: "GP Error",
                  message: "Problem downloading data."
                });
        }
        
        that.tabContainer.selectTab(that.nls.results);
        html.setStyle(that.progressBar.domNode, 'display', 'none');        
      },

      onSearchCatchZero:function(){
          
          var inputData = {};

          if(this.SAMPLETYPE == 'BOB' && $('#taxonDD').multipleSelect('getSelects').length > 0 && $('#bobStageDD').multipleSelect('getSelects').length > 0){
            var gp_url = this.config.gp_data_tools.catchzeroBob;
            inputData['InputSpeciesQuery'] = this.buildWhereClause('species') + "and taxon_name = '%taxa%'";
            var taxonlist = [];
            for(var r=0; r < $('#taxonDD').multipleSelect('getSelects').length; r++){
              taxonlist.push($('#taxonDD').multipleSelect('getSelects')[r])              
            }
            var stagelist = [];
            for(var sb=0; sb < $('#bobStageDD').multipleSelect('getSelects').length; sb++){
              stagelist.push($('#bobStageDD').multipleSelect('getSelects')[sb])              
            }
            if(stagelist.length > 1){
              new Message({
                  titleLabel: "Error",
                  message: "Please Select Only one Stage for Catch with Zero"
                });
              return;
            }
            inputData['InputQueryHaul'] = this.buildWhereClause('haul') +"and ZOOP_PROC IS NOT NULL AND NUMBER_OF_JARS >0";
            inputData['Taxa_List'] = taxonlist;
            inputData['stage'] = stagelist[0];
          }
          else if(this.SAMPLETYPE == 'ICHBASE' && $('#ichSpeciesDD').multipleSelect('getSelects').length > 0 && $('#ichStageDD').multipleSelect('getSelects').length > 0){
            var gp_url = this.config.gp_data_tools.catchzero;
            inputData['InputSpeciesQuery'] = this.buildWhereClause('species') + "and species_name = '%specie%'";
            var specieslist = [];
            for(var s=0; s < $('#ichSpeciesDD').multipleSelect('getSelects').length; s++){
              specieslist.push($('#ichSpeciesDD').multipleSelect('getSelects')[s])              
            }
            var stagelist = [];
            for(var sb=0; sb < $('#ichStageDD').multipleSelect('getSelects').length; sb++){
              stagelist.push($('#ichStageDD').multipleSelect('getSelects')[sb])              
            }
            if(stagelist.length > 1){
              new Message({
                  titleLabel: "Error",
                  message: "Please Select Only one Stage for Catch with Zero"
                });
              return;
            }
            inputData['stage'] = stagelist[0];
            inputData['InputQueryHaul'] = this.buildWhereClause('haul') + "and ICH_PROC IS NOT NULL AND NUMBER_OF_JARS >0";
            inputData['Species_List'] = specieslist;
          }
          else{
              new Message({
                  titleLabel: "Error",
                  message: "Please Select ICH Species or BOB Taxon Codes and 1 Stage"
                });
              return;
          }

          var gps = new Geoprocessor(gp_url);
          gps.on("job-complete", this.returnGPFile); //output_catch_zero 
          gps.on('error', this.error4GP);
          gps.token = this.map.config.layers.layer[1].token;
          gps.submitJob(inputData);

          html.empty(this.divResultMessage);
          html.place(html.toDom("Running Catch w/ Zero Calculations. Please be patient. The output File will be downloaded as a spreadsheet."), this.divResultMessage);
          this.tabContainer.selectTab(this.nls.results);
          html.setStyle(this.progressBar.domNode, 'display', 'block');
      },

      onSearchTrawlLength:function(){
        if($('#trawlSpeciesDD').multipleSelect('getSelects').length > 0){
          var inputData = {};
          inputData['SQL_Query'] = this.buildWhereClause('');
          var gp_url = this.config.gp_data_tools.trawllength;
          var gps = new Geoprocessor(gp_url);
          gps.on("job-complete", this.returnGPFileTrawl); //standardlength_freq_trawl_xls  //totallength_freq_trawl_xls //forklength_freq_trawl_xls //lengthsea_freq_trawl_xls 
          gps.on('error', this.error4GP);
          gps.token = this.map.config.layers.layer[1].token;
          gps.submitJob(inputData);

          html.empty(this.divResultMessage);
          html.place(html.toDom("Running Trawl Length Calculations. Please be patient. Four (4) Files will be downloaded showing different length Summaries"), this.divResultMessage);
          this.tabContainer.selectTab(this.nls.results);
          html.setStyle(this.progressBar.domNode, 'display', 'block');
        }
        else{
          new Message({
                  titleLabel: "Query Error",
                  message: "Please Select Trawl Species for Length Calculations"
                });
        }
        
      },

      onSearchIchFreq:function(){
        if($('#ichSpeciesDD').multipleSelect('getSelects').length > 0 ){
          var inputData = {};
          inputData['Input_Query_Filter'] = this.buildWhereClause('');
          var gp_url = this.config.gp_data_tools.ichlength;

          var gps = new Geoprocessor(gp_url);
          gps.on("job-complete", this.returnGPFileIchFrequ);//Output_Excel_FIle 
          gps.on('error', this.error4GP);
          gps.token = this.map.config.layers.layer[1].token;
          gps.submitJob(inputData);

          html.empty(this.divResultMessage);
          html.place(html.toDom("Running Ich Frequency Calculations. Please be patient. The output File will be downloaded as a spreadsheet."), this.divResultMessage);
          this.tabContainer.selectTab(this.nls.results);
          html.setStyle(this.progressBar.domNode, 'display', 'block');
        }
        else{
          new Message({
                  titleLabel: "Query Error",
                  message: "Please Select Ich Species for Frequency Calculations"
                });
        }
      }, 

      onSearchAbud:function(){
        if($('#ichSpeciesDD').multipleSelect('getSelects').length > 0){
          var inputData = {};
          inputData['Input_Query'] = this.buildWhereClause('');
          var gp_url = this.config.gp_data_tools.ichabundance;

          var gps = new Geoprocessor(gp_url);
          gps.on("job-complete", this.returnGPFileIchAbundance);
          gps.on('error', this.error4GP); //Output_Table 
          gps.token = this.map.config.layers.layer[1].token;
          gps.submitJob(inputData);

          html.empty(this.divResultMessage);
          html.place(html.toDom("Running Ich Abundance Calculations. Please be patient. The output File will be downloaded as a spreadsheet."), this.divResultMessage);
          this.tabContainer.selectTab(this.nls.results);
          html.setStyle(this.progressBar.domNode, 'display', 'block');
        }
        else{
          new Message({
                  titleLabel: "Error",
                  message: "Please Select Species Types for Abudance Query"
                });
        }
        
      }, 

      ///BIG SEARCH
      onSearch: function () {
        //var content = this.paramsDijit.getSingleParamValues();
        /*if (!content || content.length === 0 || !this.config.layers.length) {
          return;
        }*/
        this.search(null, this.AttributeLayerIndex, this.expressIndex);
      },

      _onBtnGraSearchClicked: function () {
        if (this.garr.length > 0) {
          if (!this.keepgraphicalsearchenabled) {
            this.map.enableMapNavigation();
          }
          this.lastDrawCommonType = null;
          this.lastDrawTool = null;
          if (this.cbxBufferGraphic.getValue()) {
            var geoms = array.map(this.garr, function (gra) {
              return gra.geometry;
            });
            this._bufferGeometries(geoms, new SpatialReference({
              wkid: this.bufferWKID
            }), [parseFloat(this.txtBufferValue.get('value'))], this.bufferUnits.get('value'), true);
          } else {
            this.search(this.unionGeoms(this.garr), this.graphicLayerIndex);
          }
        }
      },

      _onCbxMultiGraphicClicked: function () {
        if (this.cbxMultiGraphic.getValue()) {
          this.drawBox.deactivateAfterDrawing = false;
          html.setStyle(this.btnGraSearch, 'display', 'inline-block');
        } else {
          if(this.keepgraphicalsearchenabled){
            this.drawBox.deactivateAfterDrawing = false;
          }else{
            this.drawBox.deactivateAfterDrawing = true;
          }
          html.setStyle(this.btnGraSearch, 'display', 'none');
        }
      },

      unionGeoms: function (gArray) {
        var retGeom;
        var mPoint = new Multipoint(this.map.spatialReference);
        var mPoly = new Polygon(this.map.spatialReference);
        var mPolyL = new Polyline(this.map.spatialReference);
        var rType;
        this.polygonsToDiscard = [];
        if (gArray.length > 0 && gArray[0].geometry.type === "polygon") {
          //For each polygon, test if another polgon exists that contains the first polygon.
          //If it does, the polygon will not be included in union operation and it will added to the polygonsToDiscard array.
          dojo.forEach(gArray, lang.hitch(this, function (graphic) {
            var poly1 = graphic.geometry;
            dojo.forEach(this.gArray, lang.hitch(this, function (aGraphic) {
              var aPoly = aGraphic.geometry;
              if (aPoly.extent.contains(this.graphic.geometry) && (aPoly.extent.center.x !== poly1.extent.center.x ||
                                                                   aPoly.extent.center.y !== poly1.extent.center.y)) {
                this.polygonsToDiscard.push(poly1);
              }
            }));
          }));
        }
        //globals
        var poly, ext, j, mp, ringArray;
        dojo.forEach(gArray, lang.hitch(this, function (graphic) {
          if (graphic.geometry.type === "point" && !this.cbxAddTolerance.getValue()) {
            mPoint.addPoint(graphic.geometry);
            rType = "point";
          } else if (graphic.geometry.type === "point" && this.cbxAddTolerance.getValue()) {
            ext = this.pointToExtent(graphic.geometry, this.pointSearchTolerance);
            ringArray = this.extentToMPArray(ext);
            mPoly.addRing(ringArray);
            rType = "poly";
            mPoly.spatialReference = ext.spatialReference;
          }
          if (graphic.geometry.type === "multipoint") {
            var mp1 = graphic.geometry;
            for (var p = 0; p < mp1.points.length; p++) {
              mPoint.addPoint(mp1.points[p]);
            }
            rType = "point";
          }
          if (graphic.geometry.type === "polyline") {
            var polyl = graphic.geometry;
            for (var l = polyl.paths.length - 1; l >= 0; l--) {
              var pathArray = [];
              for (j = 0; j < polyl.paths[l].length; j++) {
                mp = polyl.getPoint(l, j);
                mp.spatialReference = polyl.spatialReference;
                pathArray.push(mp);
              }
              mPolyL.addPath(pathArray);
            }
            rType = "line";
          }
          if (graphic.geometry.type === "extent") {
            ext = graphic.geometry;
            ringArray = this.extentToMPArray(ext);
            mPoly.addRing(ringArray);
            rType = "poly";
            mPoly.spatialReference = ext.spatialReference;
          }
          if (graphic.geometry.type === "polygon") {
            poly = graphic.geometry;
            //Consider only the rings that not coincide with any polygon ring on polygonsToDiscard array.
            var targetRings = [];
            for (var m = 0; m < poly.rings.length; m++) {
              var polygonToDiscard;
              var targetRing = [];
              var targetPolygon = new Polygon([poly.rings[m]], poly.spatialReference);
              var add = true;
              if (this.polygonsToDiscard.length > 0) {
                for (polygonToDiscard in this.polygonsToDiscard) {
                  add = true;
                  if (targetPolygon.extent.center.x === polygonToDiscard.extent.center.x &&
                      targetPolygon.extent.center.y === polygonToDiscard.extent.center.y) {
                    add = false;
                    break;
                  }
                }
                if (add) {
                  targetRing[0] = m;
                  targetRing[1] = poly.rings[m];
                  targetRings.push(targetRing);
                }
              } else {
                targetRing[0] = m;
                targetRing[1] = poly.rings[m];
                targetRings.push(targetRing);
              }
            }
            for (var i2 = targetRings.length - 1; i2 >= 0; i2--) {
              ringArray = [];
              for (var j1 = 0; j1 < targetRings[i2][1].length; j1++) {
                var mp2 = poly.getPoint(i2, j1);
                mp2.spatialReference = poly.spatialReference;
                ringArray.push(mp2);
              }
              mPoly.addRing(ringArray);
            }
            rType = "poly";
            mPoly.spatialReference = poly.spatialReference;
          }
        }));

        switch (rType) {
        case "point":
          {
            retGeom = mPoint;
            break;
          }
        case "poly":
          {
            retGeom = mPoly;
            break;
          }
        case "line":
          {
            retGeom = mPolyL;
            break;
          }
        }
        this.garr = [];
        return retGeom;
      },

      pointToExtent: function (objPoint, distance) {
        var clickOffset = distance || 6;
        var centerPoint = new Point(objPoint.x, objPoint.y, objPoint.spatialReference);
        var mapWidth = this.map.extent.getWidth();
        var pixelWidth = mapWidth / this.map.width;
        var tolerance = clickOffset * pixelWidth;
        var queryExtent = new Extent(1, 1, tolerance, tolerance, objPoint.spatialReference);
        return queryExtent.centerAt(centerPoint);
      },

      extentToPolygon: function (extent) {
        var polygon = new Polygon([extent.xmax, extent.ymax], [extent.xmax, extent.ymin], [extent.xmin, extent.ymin],
                                  [extent.xmin, extent.ymax], [extent.xmax, extent.ymax]);
        polygon.setSpatialReference(this.map.spatialReference);
        return polygon;
      },

      extentToMPArray: function (extent) {
        var MPArr = [[extent.xmax, extent.ymax], [extent.xmax, extent.ymin], [extent.xmin, extent.ymin],
                     [extent.xmin, extent.ymax], [extent.xmax, extent.ymax]];
        return MPArr;
      },

      checkforenterkey: function (evt) {
        var keyNum = evt.keyCode !== undefined ? evt.keyCode : evt.which;
        if (keyNum === 13) {
          this.search(null, this.AttributeLayerIndex, this.expressIndex);
        }
      },

      onNewSelection: function(){
        html.replaceClass(this.gSelectType.iconNode, 'newSelIcon', 'removeSelIcon');
        html.replaceClass(this.gSelectType.iconNode, 'newSelIcon', 'addSelIcon');
        this.gSelectTypeVal = 'new';
      },

      onAddSelection: function(){
        html.replaceClass(this.gSelectType.iconNode, 'addSelIcon', 'newSelIcon');
        html.replaceClass(this.gSelectType.iconNode, 'addSelIcon', 'removeSelIcon');
        this.gSelectTypeVal = 'add';
      },

      onRemoveSelection: function(){
        html.replaceClass(this.gSelectType.iconNode, 'removeSelIcon', 'newSelIcon');
        html.replaceClass(this.gSelectType.iconNode, 'removeSelIcon', 'addSelIcon');
        this.gSelectTypeVal = 'rem';
      },

      onNewSelection2: function(){
        html.replaceClass(this.aSelectType.iconNode, 'newSelIcon', 'removeSelIcon');
        html.replaceClass(this.aSelectType.iconNode, 'newSelIcon', 'addSelIcon');
        this.aSelectTypeVal = 'new';
      },

      onAddSelection2: function(){
        html.replaceClass(this.aSelectType.iconNode, 'addSelIcon', 'newSelIcon');
        html.replaceClass(this.aSelectType.iconNode, 'addSelIcon', 'removeSelIcon');
        this.aSelectTypeVal = 'add';
      },

      onRemoveSelection2: function(){
        html.replaceClass(this.aSelectType.iconNode, 'removeSelIcon', 'newSelIcon');
        html.replaceClass(this.aSelectType.iconNode, 'removeSelIcon', 'addSelIcon');
        this.aSelectTypeVal = 'rem';
      },

      search: function (geometry, layerIndex, /* optional */ expressIndex, theValue, spatialRelationship, closeOnComplete) {
        
        var adding = false,
            removing = false;
        if (typeof closeOnComplete === 'undefined') {
          closeOnComplete = false;
        }
        this.oidArray = [];
        if (!this.config.layers) {
          return;
        }
        if (this.config.layers.length === 0) {
          return;
        }

        if (geometry) {
          //get the adding or removing
          if(this.gSelectTypeVal === 'add'){
            adding = true;
          }
          if(this.gSelectTypeVal === 'rem'){
            removing = true;
          }
        }else{
          //get the adding or removing
          if(this.aSelectTypeVal === 'add'){
            adding = true;
          }
          if(this.aSelectTypeVal === 'rem'){
            removing = true;
          }
        }
        var queryParams = new Query();
        if(!adding && !removing){
          //this.clear();
        }else{
          this._clearLayers();
          this._clearRelateLayers();
          this.drawBox.clear();
          this.garr = [];
          this.lastDrawCommonType = null;
          this.lastDrawTool = null;
        }
        this.currentSearchLayer = this._createSearchResultLayer(layerIndex || 0);
        this.currentLayerIndex = layerIndex;

        var layerConfig = this.config.layers[layerIndex];

        if (geometry) {
          this.initiator = 'graphic';
          queryParams.geometry = geometry;
          queryParams.spatialRelationship = spatialRelationship || Query.SPATIAL_REL_INTERSECTS;
          if(this.cbxAddTextQuery.getValue()){

            this.tabContainer.selectTab(this.nls.selectByAttribute);
            queryParams.where = this.buildWhereClause('');  
          }
        } 
        else{

          this.tabContainer.selectTab(this.nls.selectByAttribute);
          queryParams.where = this.buildWhereClause('');  
        }
        if(layerIndex>8){
          queryParams.where = '1=1';
        }
        else if(queryParams.where == "" && !geometry){
          new Message({
            titleLabel: "Query Error",
            message: "Please Make a Query Selection from the Dropdown lists"
          });
          this.tabContainer.selectTab(this.nls.selectByAttribute);
          return;
        }
        else{

          if (this.rsltsTab) {
            this.tabContainer.selectTab(this.nls.results);
          }

          //Clear ecodaat layer
          //this.map.getLayer('EcoDAAT Layers').setVisibleLayers([-1]);
        }
        
        //check for required fields
        /*if(this.initiator === 'attribute' || this.initiator === 'graphic' && this.cbxAddTextQuery.getValue()){
          if(!this.checkForRequiredFieldsEntered()){
            new Message({
              titleLabel: this.nls.requiredWarning,
              message: this.nls.requiredErrorMessage
            });
            return;
          }
        }*/

        html.setStyle(this.progressBar.domNode, 'display', 'block');
        html.setStyle(this.divOptions, 'display', 'none');
        var fields = [];

        //add dynamic fields
        /*if (this.config.layers[layerIndex].fields.all) {
          fields[0] = "*";
        } else {
          for (var i = 0, len = this.config.layers[layerIndex].fields.field.length; i < len; i++) {
            fields[i] = this.config.layers[layerIndex].fields.field[i].name;
          }
        }
        if (!this.config.layers[layerIndex].existObjectId && fields.indexOf(this.config.layers[layerIndex].objectIdField) < 0) {
          if(!this.config.layers[layerIndex].fields.all){
            fields.push(this.config.layers[layerIndex].objectIdField);
          }
        }*/

        var fieldsselected = this.fieldselectdropdown.getOptions();
        fields.push(layerConfig.objectIdField);
        for (var i = 0, len = fieldsselected.length; i < len; i++) {
          if(fieldsselected[i].selected){
            fields.push(fieldsselected[i].value);
          }
        }

        queryParams.outSpatialReference = this.map.spatialReference;
        queryParams.outFields = fields;

        if(this._isServiceSupportsOrderBy(this.resultLayers[layerIndex])){
          //set sorting info
          var orderByFields = this.config.layers[layerIndex].orderByFields;   //Need to feed in my orderby field array

          if(orderByFields && orderByFields.length > 0){
            queryParams.orderByFields = orderByFields;

            var orderFieldNames = array.map(orderByFields, lang.hitch(this, function(orderByField){
              var splits = orderByField.split(' ');
              return splits[0];
            }));

            //make sure orderFieldNames exist in outFields, otherwise the query will fail
            array.forEach(orderFieldNames, lang.hitch(this, function(orderFieldName){
              if(queryParams.outFields.indexOf(orderFieldName) < 0){
                queryParams.outFields.push(orderFieldName);
              }
            }));
          }
        }
        if(layerIndex>8){
          queryParams.returnGeometry = false;  
          queryParams.outFields = ['*'];
        }
        else if(this.checkBox4LargeQuery.checked){
          queryParams.returnGeometry = false;
        }
        else{
          queryParams.returnGeometry = true;
        }

        var queryTask = new QueryTask(layerConfig.url);
        html.empty(this.divResultMessage);
        html.place(html.toDom(this.nls.searching), this.divResultMessage);
        queryTask.execute(queryParams, lang.hitch(this, this._onSearchFinish, layerIndex, closeOnComplete, removing, adding, queryParams.where),
          lang.hitch(this, this._onSearchError));
      },

      isSelTabVisible: function () {
        switch (this.selTab) {
        case this.nls.selectByAttribute:
          return this.attribTab;
        case this.nls.selectFeatures:
          return this.shapeTab;
        case this.nls.selectSpatial:
          return this.spatTab;
        case this.nls.selectFields:
          return this.fieldTab;
        case this.nls.results:
          return this.rsltsTab;
        }
      },

      clearFields: function () {
        if(this.AttributeLayerIndex || this.AttributeLayerIndex === 0){
          var exInd = this.expressIndex || 0;
          if(exInd > 0){
            this.onAttributeLayerExpressionChange(this.expressIndex);
          }else{
            this.onAttributeLayerChange(this.AttributeLayerIndex);
          }
          var valuesObj = lang.clone(this.config.layers[this.AttributeLayerIndex].expressions.expression[exInd].values.value);
          //console.info(valuesObj);
          array.map(valuesObj, lang.hitch(this, function(valObj){
            if(valObj.operation.toLowerCase().indexOf('date') > -1){
              if(valObj.valueObj.hasOwnProperty('value')){
                valObj.valueObj.value = "";
              }
              if(valObj.valueObj.hasOwnProperty('value1')){
                valObj.valueObj.value1 = "";
              }
              if(valObj.valueObj.hasOwnProperty('value2')){
                valObj.valueObj.value2 = "";
              }
              this.paramsDijit.setSingleParamValues(valuesObj, "");
            }
          }));
        }
      },

      clear: function ( /* optional */ closeAtt, clearsearchgeom) {
        if(this.sumDivEvt){
          this.sumDivEvt.remove();
        }
        html.removeClass(this.list.domNode, 'sum');
        html.setStyle(this.divSum, 'display', 'none');
        html.setStyle(this.divOptions, 'display', 'none');
        this.currentLayerIndex = null;
        this.currentCSVResults = null;
        this.initiator = null;
        this.lastWhere = null;
        this.oidArray = [];
        this.currentFeatures = [];
        this._hideInfoWindow();
        this._clearLayers();
        this._clearRelateLayers();
        this.divSum.innerHTML = '';
        this.zoomAttempt = 0;
        this.gSelectTypeVal = 'new';
        this.aSelectTypeVal = 'new';
        this.sumResultArr = [];
        html.replaceClass(this.gSelectType.iconNode, 'newSelIcon', 'removeSelIcon');
        html.replaceClass(this.gSelectType.iconNode, 'newSelIcon', 'addSelIcon');
        html.replaceClass(this.aSelectType.iconNode, 'newSelIcon', 'removeSelIcon');
        html.replaceClass(this.aSelectType.iconNode, 'newSelIcon', 'addSelIcon');
        if (closeAtt) {
          if (this.list.items.length > 0 && this.isSelTabVisible()) {
            this.tabContainer.selectTab(this.selTab);
          }
        }
        this.list.clear();
        html.empty(this.divResultMessage);

        if(clearsearchgeom){
          this.drawBox.clear();  
        }        
        this.garr = [];
        this.lastDrawCommonType = null;
        this.lastDrawTool = null;
        if (closeAtt) {
          if (this.wManager && this.attTableOpenedbySearch) {
            var widgetCfg = this._getWidgetConfig('AttributeTable');
            if(widgetCfg){
              var attWidget = this.wManager.getWidgetByLabel(widgetCfg.label);
              if (attWidget) {
                attWidget._closeTable();
              }
              this.attTableOpenedbySearch = false;
            }
          }
        }

        this.checkBox4LargeQuery.setValue(false);

        //this.map.getLayer('EcoDAAT Layers').setVisibleLayers([0]);

        $('#cruiseSeacatDD').multipleSelect('uncheckAll');
        $('#cruisectdbDD').multipleSelect('uncheckAll');
        $('#cruisenutrientDD').multipleSelect('uncheckAll');
        $('#cruisechlorDD').multipleSelect('uncheckAll');
        $('#specieTypeDD').multipleSelect('uncheckAll');
        $('#sampleTypeDD').multipleSelect('uncheckAll');
        $('#geo_locDD').multipleSelect('uncheckAll');
        $('#taxonDD').multipleSelect('uncheckAll');
        $('#cruiseDD').multipleSelect('uncheckAll');
        $('#projectDD').multipleSelect('uncheckAll');
        $('#trawlSpeciesDD').multipleSelect('uncheckAll');
        $('#gearDD').multipleSelect('uncheckAll');
        $('#purposeDD').multipleSelect('uncheckAll');
        $('#ichStageDD').multipleSelect('uncheckAll');
        $('#bobSizeDD').multipleSelect('uncheckAll');
        $('#bobStageDD').multipleSelect('uncheckAll');
        $('#zoopProtocolDD').multipleSelect('uncheckAll');
        $('#ichSpeciesDD').multipleSelect('uncheckAll');
        $('#netDD').multipleSelect('uncheckAll');
        $('#primaryNetDD').multipleSelect('uncheckAll');
        $('#meshDD').multipleSelect('uncheckAll');
        $('#performanceDD').multipleSelect('uncheckAll');
        $('#sexDD').multipleSelect('uncheckAll');
        
        $('#minBottom').val(0);
        $('#maxBottom').val(1400);
        $('#minGearDepth').val(0);
        $('#maxGearDepth').val(1400);
        $('#haulidtext').val('Search FOCI HAUL ID');

        return false;
      },

      clearbuffer: function () {
        this.garr = [];
        this.graphicsLayerBuffer.clear();
        html.setStyle(this.btnClearBuffer2, 'display', 'none');
        return false;
      },

      buildQueryValue: function(d, number){
        var queryTextFromDropDown = "";
        if(d.length == 1){
          if(number){//for sampletype that has commas
            queryTextFromDropDown = " IN (" + d[0]+ ') ';
          }
          else{
            queryTextFromDropDown = " = '" + d[0] +"' ";  
          }
          
          return queryTextFromDropDown;
        }
        else{
          var queryTextFromDropDown = " IN (";
          for(var r=0; r < d.length; r++){
            if(number){
              queryTextFromDropDown += d[r] + ",";  
            }
            else{
              queryTextFromDropDown += "'" + d[r] + "',";
            }
          }
          return queryTextFromDropDown.slice(0, -1) + ') ';
        }
      },

      buildWhereClause: function (layerIndex, expressIndex, theValue) {
        //WHEERRE
        var expr = "";//"1=1";

        //HAUL related
        if($('#depthSpinners').is(":visible")){
          if($('#minBottom').val() != 0 || $('#maxBottom').val() != 1400){
            expr+= "BOTTOM_DEPTH > " + Number($('#minBottom').val())  + " AND BOTTOM_DEPTH <"+Number($('#maxBottom').val()) + " ";
          }
          if($('#minGearDepth').val() != 0 || $('#maxGearDepth').val() != 1400){
            expr+= "AND MIN_GEAR_DEPTH > " + Number($('#minGearDepth').val())  + " AND MAX_GEAR_DEPTH <"+Number($('#maxGearDepth').val())  + " "; 
          }
          if($('#haulidtext').val() != 'Search FOCI HAUL ID' && $('#haulidtext').val() != ""){
            expr+= "AND HAUL_ID LIKE '%"+ $('#haulidtext').val().toUpperCase()+"%' ";
          }
        }

        if($(".cruiseSeacatClass span").text() != "All selected" && $("#cruiseSeacatDD option:selected").index() > -1 && $('.cruiseSeacatClass').is(":visible")){
          expr+= "AND CRUISE"+this.buildQueryValue($('#cruiseSeacatDD').multipleSelect('getSelects'));
        }
        if($(".cruisectdClass span").text() != "All selected" && $("#cruisectdbDD option:selected").index() > -1 && $('.cruisectdClass').is(":visible")){
          expr+= "AND CRUISE"+this.buildQueryValue($('#cruisectdbDD').multipleSelect('getSelects'));
        }
        if($(".cruisenutrientClass span").text() != "All selected" && $("#cruisenutrientDD option:selected").index() > -1 && $('.cruisenutrientClass').is(":visible")){
          expr+= "AND CRUISE"+this.buildQueryValue($('#cruisenutrientDD').multipleSelect('getSelects'));
        }
        if($(".cruisechlorClass span").text() != "All selected" && $("#cruisechlorDD option:selected").index() > -1 && $('.cruisechlorClass').is(":visible")){
          expr+= "AND CRUISE"+this.buildQueryValue($('#cruisechlorDD').multipleSelect('getSelects'));
        }
        if($("#specieTypeDD option:selected").index() > -1 && $('.specieTypeClass').is(":visible") && layerIndex != 'haul'){
          expr+= "AND ORIG_DB"+this.buildQueryValue($('#specieTypeDD').multipleSelect('getSelects'));
        }
        if($(".sampleTypeClass span").text() != "All selected" && $("#sampleTypeDD option:selected").index() > -1 && $('.sampleTypeClass').is(":visible") && layerIndex != 'haul' && this.layerValueforFieldArray !=1){
          expr+= "AND SAMPLE_TYPE"+this.buildQueryValue($('#sampleTypeDD').multipleSelect('getSelects'),true);
        }
        if($(".geo_locClass span").text() != "All selected" && $("#geo_locDD option:selected").index() > -1 && $('.geo_locClass').is(":visible")){
          expr+= "AND GEOGRAPHIC_AREA"+this.buildQueryValue($('#geo_locDD').multipleSelect('getSelects'));
        }
        if($(".taxonClass span").text() != "All selected" && $("#taxonDD option:selected").index() > -1 && $('.taxonClass').is(":visible") && layerIndex != 'haul' && layerIndex != 'species'){
          expr+= "AND TAXON_NAME"+this.buildQueryValue($('#taxonDD').multipleSelect('getSelects')); //TAXON_NAME
        }
        if($(".cruiseClass span").text() != "All selected" && $("#cruiseDD option:selected").index() > -1 && $('.cruiseClass').is(":visible")){
          expr+= "AND CRUISE"+this.buildQueryValue($('#cruiseDD').multipleSelect('getSelects'));
        }
        if($(".projectClass span").text() != "All selected" && $("#projectDD option:selected").index() > -1 && $('.projectClass').is(":visible")){
          expr+= "AND PROJECT"+this.buildQueryValue($('#projectDD').multipleSelect('getSelects')); //PROJECT
        }
        if($(".trawlSpeciesClass span").text() != "All selected" && $("#trawlSpeciesDD option:selected").index() > -1 && $('.trawlSpeciesClass').is(":visible") && layerIndex != 'haul'){
          expr+= "AND SPECIES_NAME"+this.buildQueryValue($('#trawlSpeciesDD').multipleSelect('getSelects')); //SPECIES_NAME
        }
        if($(".gearClass span").text() != "All selected" && $("#gearDD option:selected").index() > -1 && $('.gearClass').is(":visible")){
          expr+= "AND GEAR_NAME"+this.buildQueryValue($('#gearDD').multipleSelect('getSelects')); //GEAR_NAME
        }
        if($(".purposeClass span").text() != "All selected" && $("#purposeDD option:selected").index() > -1 && $('.purposeClass').is(":visible")){
          expr+= "AND PURPOSE"+this.buildQueryValue($('#purposeDD').multipleSelect('getSelects')); //PURPOSE
        }
        if($(".ichStageClass span").text() != "All selected" && $("#ichStageDD option:selected").index() > -1 && $('.ichStageClass').is(":visible") && layerIndex != 'haul'){
          expr+= "AND STAGE_NAME"+this.buildQueryValue($('#ichStageDD').multipleSelect('getSelects')); //STAGE_NAME
        }
        if($(".bobSizeClass span").text() != "All selected" && $("#bobSizeDD option:selected").index() > -1 && $('.bobSizeClass').is(":visible") && layerIndex != 'haul'){
          expr+= "AND TAXON_SIZE"+this.buildQueryValue($('#bobSizeDD').multipleSelect('getSelects'));//TAXON_SIZE 
        }
        if($(".bobStageClass span").text() != "All selected" && $("#bobStageDD option:selected").index() > -1 && $('.bobStageClass').is(":visible") && layerIndex != 'haul'){
          expr+= "AND STAGE_NAME"+this.buildQueryValue($('#bobStageDD').multipleSelect('getSelects')); //STAGE_NAME
        }
        if($(".zoopProtocolClass span").text() != "All selected" && $("#zoopProtocolDD option:selected").index() > -1 && $('.zoopProtocolClass').is(":visible") && layerIndex != 'haul'){
          expr+= "AND ZOOP_PROTOCOL"+this.buildQueryValue($('#zoopProtocolDD').multipleSelect('getSelects')); //ZOOP_PROTOCOL 
        }
        if($(".ichSpeciesClass span").text() != "All selected" && $("#ichSpeciesDD option:selected").index() > -1 && $('.ichSpeciesClass').is(":visible") && layerIndex != 'haul' && layerIndex != 'species'){
          expr+= "AND SPECIES_NAME"+this.buildQueryValue($('#ichSpeciesDD').multipleSelect('getSelects'));//SPECIES_NAME
        }
        if($(".netClass span").text() != "All selected" && $("#netDD option:selected").index() > -1 && $('.netClass').is(":visible") && $('#netDD').is(":visible")){
          expr+= "AND NET"+this.buildQueryValue($('#netDD').multipleSelect('getSelects'),true); //NET
        }
        if($(".primaryNetClass span").text() != "All selected" && $("#primaryNetDD option:selected").index() > -1 && $('.primaryNetClass').is(":visible")){
          expr+= "AND PRIMARY_NET"+this.buildQueryValue($('#primaryNetDD').multipleSelect('getSelects')); ////PRIMARY_NET
        }
        if($(".meshClass span").text() != "All selected" && $("#meshDD option:selected").index() > -1 && $('.meshClass').is(":visible")){
          expr+= "AND MESH"+this.buildQueryValue($('#meshDD').multipleSelect('getSelects'),true); //MESH
        }
        if($(".performanceClass span").text() != "All selected" && $("#performanceDD option:selected").index() > -1 && $('.performanceClass').is(":visible")){
          expr+= "AND HAUL_PERFORMANCE"+this.buildQueryValue($('#performanceDD').multipleSelect('getSelects'));//HAUL_PERFORMANCE
        }
        if($(".sexClass span").text() != "All selected" && $("#sexDD option:selected").index() > -1 && $('.sexClass').is(":visible") && layerIndex != 'haul'){
          expr+= "AND SEX"+this.buildQueryValue($('#cruiseDD').multipleSelect('getSelects'),true);
        }

        //add dynmiac Time
        if(this.layerValueforFieldArray<9){
          //day
          var dayselected = this.dayselect.getOptions();
          if(dayselected[0].selected && dayselected[1].selected){
          }
          else if(dayselected[0].selected){
            expr += 'AND EXTRACT(DAY FROM "GMT_DATE_TIME") > 14 ';  
          }
          else{
            expr += 'AND EXTRACT(DAY FROM "GMT_DATE_TIME") < 15 ';   
          }
          
          //month
          var monthselected = this.monthselect.getOptions();
          var allmonths = true;
          var monthlist = '';
          for (var m = 0, len = monthselected.length; m < len; m++) {
            
            if(monthselected[m].selected){
              monthlist = monthlist + monthselected[m].value  + "," ;
            }
            else {
              allmonths = false;
            }
          }
          if(!allmonths){
            expr += 'AND EXTRACT(MONTH FROM "GMT_DATE_TIME") in ('+ monthlist.slice( 0, -1 )+') ';
          }

          //year 
          var yearselected = this.yearselect.getOptions();
          var allyears = true;
          var yearlist = '';
          for (var y = 0, len = yearselected.length; y < len; y++) {
            if(yearselected[y].selected){
              yearlist = yearlist + yearselected[y].value  + "," ;
            }
            else {
              allyears = false;
            }
          }
          if(!allyears){
            expr += 'AND EXTRACT(YEAR FROM "GMT_DATE_TIME") in ('+yearlist.slice( 0, -1 )+') ';
          }
        }

        if(expr.substring(0,3) == "AND"){
          expr = expr.substring(3);
        }

        return expr;
      },

      AppendTo: function (string1, string2, operator) {
        if (string1.length > 0) {
          return string1 + " " + operator + " " + string2;
        } else {
          return string2;
        }
      },

      trimArray: function (arr) {
        for (var i = 0; i < arr.length; i++) {
          arr[i] = arr[i].replace(/^\s*/, '').replace(/\s*$/, '');
        }
        return arr;
      },

      zoomall: function () {
        var layerConfig = this.config.layers[this.currentLayerIndex];
        var zoomScale = layerConfig.zoomScale || 10000;
        if (!this.currentLayerAdded) {
          return false;
        }
        if (this.currentLayerAdded.graphics.length === 1 && this.currentLayerAdded.graphics[0].geometry.type === "point") {
          var mp = this.currentLayerAdded.graphics[0].geometry;
          this.map.setScale(zoomScale);
          this.map.centerAt(mp);
        } else {
          if (this.currentLayerAdded.graphics.length === 0) {
            if (this.zoomAttempt <= 10) {
              setTimeout(lang.hitch(this, function () {
                this.zoomall();
              }), 300);
              this.zoomAttempt++;
            } else {
              this.zoomAttempt = 0;
              new Message({
                titleLabel: this.nls.warning,
                message: this.nls.zoomErrorMessage
              });
            }
          }
          var gExt = graphicsUtils.graphicsExtent(this.currentLayerAdded.graphics);
          if (gExt) {
            this.map.setExtent(gExt.expand(.9), true);
          } else {
            var mp2 = this.currentLayerAdded.graphics[0].geometry;
            this.map.setScale(zoomScale);
            this.map.centerAt(mp2);
          }
        }
        return false;
      },

      _clearLayers: function () {
        this._removeAllResultLayers();
        html.setStyle(this.btnClear2, 'display', 'none');
        html.setStyle(this.btnClear3, 'display', 'none');
      },

      _clearRelateLayers: function () {
        this._removeAllRelateLayers();
      },

      _onSearchError: function (error) {
        //this.clear();
        this.drawBox.clear(); 
        html.setStyle(this.progressBar.domNode, 'display', 'none');
        this.tabContainer.selectTab(this.nls.selectByAttribute);
        new Message({
          title: "Search Problem",
          message: this.nls.searchError
        });
        console.debug(error);
      },

      _substitute: function (string, Attribs, currentLayer) {
        var lfields = this._getFieldsfromLink(string);
        for (var lf = 0; lf < lfields.length; lf++) {
          if (Attribs[lfields[lf]]) {
            var fld = this._getField(currentLayer, lfields[lf]);
            if (fld.type === "esriFieldTypeString") {
              string = string.replace(new RegExp('{' + lang.trim(lfields[lf]) + '}', 'g'), lang.trim(Attribs[lfields[lf]]));
            } else {
              string = string.replace(new RegExp('{' + lang.trim(lfields[lf]) + '}', 'g'), Attribs[lfields[lf]]);
            }
          }
        }
        return string;
      },

      _getFieldsfromLink: function (strLink) {
        var retArr = [];
        var b1 = 0;
        var e1 = 0;
        var fldName = '';
        do {
          b1 = strLink.indexOf("{", e1);
          if (b1 === -1) {
            break;
          }
          e1 = strLink.indexOf("}", b1);
          fldName = strLink.substring(b1 + 1, e1);
          retArr.push(fldName);
        } while (e1 < strLink.length - 1);
        return retArr;
      },

      _getAllLyrFields: function(){
        var tempFlds = array.filter(this.resultLayers[this.currentLayerIndex].fields, lang.hitch(this, function (fieldInfo) {
          return fieldInfo.type !== 'esriFieldTypeGeometry';
        }));
        return tempFlds;
      },

      _onSearchFinish: function (layerIndex, closeOnComplete, removing, adding, where, results) {
        var layerConfig = this.config.layers[layerIndex];
        var currentLayer;
        array.map(this.currentSearchLayer.fields, lang.hitch(this, function (element) {
          if(layerConfig.fields.all){
            element.show = true;
          }else{
            element.show = false;
            for (var f = 0; f < layerConfig.fields.field.length; f++) {
              if (layerConfig.fields.field[f].name == element.name) {
                element.show = true;
              }
            }
          }
        }));
        currentLayer = this.currentSearchLayer;
        if (layerConfig.layersymbolfrom === 'server') {
          currentLayer.setRenderer(this._setCurentLayerRenderer('server'));
        } else if(layerConfig.layersymbolfrom === 'layer') {
          currentLayer.setRenderer(this._setCurentLayerRenderer('layer'));
        } else{
          currentLayer.setRenderer(this._setCurentLayerRenderer('config'));
        }
        if (this.rsltsTab) {
          this.tabContainer.selectTab(this.nls.results);
        }
        html.setStyle(this.progressBar.domNode, 'display', 'none');
        html.setStyle(this.divOptions, 'display', 'block');

        var title = "";
        var titlefield = layerConfig.titlefield;
        var sumfield = layerConfig.sumfield || null;
        var objectIdField = layerConfig.objectIdField;
        var existObjectId = layerConfig.existObjectId;
        var typeIdField = layerConfig.typeIdField;

//modify the currentFeatures with the new results
        var csvData;
        if(adding && this.currentFeatures && this.currentFeatures.length > 0){
          csvData = this.currentCSVResults.data || [];
          array.forEach(results.features, lang.hitch(this, function(gra){
            if(this.currentFeatures.indexOf(gra) < 0){
              this.currentFeatures.push(gra);
            }
          }));
        }else if (removing && this.currentFeatures && this.currentFeatures.length > 0){
          csvData = this.currentCSVResults.data || [];
          array.forEach(results.features, lang.hitch(this, function(gra){
            for (var g = this.currentFeatures.length - 1; g >= 0; g--){
              if(this.currentFeatures[g].attributes[objectIdField] == gra.attributes[objectIdField]){
                this.currentFeatures.splice(g, 1);
                break;
              }
            }
            /*for (var g1 = csvData.length - 1; g1 >= 0; g1--){
              var csvRowRem = csvData[g1];
              if(csvRowRem.OID == gra.attributes[objectIdField]){
                csvData.splice(g1, 1);
                break;
              }
            }*/
          }));
        }else{
          csvData = [];
          this.currentCSVResults = null;
          this.currentFeatures = results.features;
        }

        var listLen = this.list.items.length;
        var len = results.features.length;

        if(where == "1=1"){
          where = ' ALL Records';
        }
        if (this.currentFeatures.length === 0) {
          html.empty(this.divResultMessage);
          html.place(html.toDom(this.nls.noResults+ "<br><br><b>Results from Search Query</b><br><br>"+where), this.divResultMessage);
          this.list.clear();
          this.gSelectTypeVal = 'new';
          this.aSelectTypeVal = 'new';
          html.replaceClass(this.gSelectType.iconNode, 'newSelIcon', 'removeSelIcon');
          html.replaceClass(this.gSelectType.iconNode, 'newSelIcon', 'addSelIcon');
          html.replaceClass(this.aSelectType.iconNode, 'newSelIcon', 'removeSelIcon');
          html.replaceClass(this.aSelectType.iconNode, 'newSelIcon', 'addSelIcon');
          html.setStyle(this.divOptions, 'display', 'none');
          return;
        } else {
          html.empty(this.divResultMessage);
          html.place(html.toDom("<label>" + this.nls.featuresSelected + this.currentFeatures.length + "</label><br><br><b>Results from Search Query</b><br><br>"+where), this.divResultMessage);
        }
        var i, slen, sumTotal, numFormat, currFormat, args, sValue, args2;
        //determine if this layer has any sum field(s)
        this._getSumFields(layerIndex);
        if(this.sumFields.length > 0){
          html.addClass(this.list.domNode, 'sum');
          html.setStyle(this.divSum, 'display', '');
        }else{
          html.removeClass(this.list.domNode, 'sum');
          html.setStyle(this.divSum, 'display', 'none');
        }
        if(this.sumFields.length > 0){
          this.sumResultArr = [];
          if(this.sumDivEvt){
            this.sumDivEvt.remove();
          }
          array.map(this.sumFields, lang.hitch(this, function(sumfield){
            sumTotal = 0;
            for ( i = 0, slen = this.currentFeatures.length; i < slen; i++) {
              var feature = this.currentFeatures[i];
              sumTotal += Number(feature.attributes[sumfield.field]);
            }

            numFormat = this._getNumberFormat(sumfield.field, layerIndex);
            if (numFormat) {
              args = numFormat.split("|");
              /*value,percision,symbol,thousands,decimal*/
              sValue = this._formatNumber(sumTotal, args[0] || null, args[1] || null, args[2] || null);
            }
            currFormat = this._getCurrencyFormat(sumfield.field, layerIndex);
            if (currFormat) {
              args2 = currFormat.split("|");
              /*value,percision,symbol,thousands,decimal*/
              sValue = this._formatCurrency(sumTotal, args2[1] || null, args2[0] || null, args2[2] || null, args2[3] || null);
            }
            this.sumResultArr.push(sumfield.sumlabel + ' ' + sValue);
          }));
          if(this.sumFields.length > 1){
            this.divSum.innerHTML = this.sumResultArr[0] + '&nbsp;&nbsp;' + this.nls.more + '...';
            html.setStyle(this.divSum, 'cursor', 'pointer');
            this.sumDivEvt = on(this.divSum, 'click', lang.hitch(this, function(){
              new Message({titleLabel: this.nls.summaryresults, message: this.sumResultArr.join('<br>')});
            }));
          }else if(this.sumFields.length === 1){
            html.setStyle(this.divSum, 'cursor', 'default');
            this.divSum.innerHTML = this.sumResultArr[0];
          }
        }
        for (i = 0; i < len; i++) {
          var featureAttributes = results.features[i].attributes;

          var lyrHideNullValues = (layerConfig.hasOwnProperty("hidenullvalue") && layerConfig.hidenullvalue)?true:false;

          var content = "",
            rsltcontent = "",
            value = "",
            csvRow = {},
            oidVal;
          
          oidVal = featureAttributes[objectIdField];
          title =featureAttributes[titlefield];
          
          /*//ensure fields are ordered the same way they are configuraed in the json (this is an issue for ArcGIS Server 10.2.x)
          var tempFlds = lang.clone(this.config.layers[layerIndex].fields.field);
          if(this.config.layers[layerIndex].fields.all){
            var tempFlds = this._getAllLyrFields();
          }
          if(!existObjectId && objectIdField && tempFlds.indexOf({"name": objectIdField}) < 0){
            tempFlds.push(
              {"name": objectIdField}
            );
          }
          array.map(tempFlds, lang.hitch(this, function (attr) {
            var att = attr.name;
            var fld = this._getField(results, att);
            
            if(!fld){
              console.info(att, results);
            }
            else if (fld.name === objectIdField) {
              oidVal = featureAttributes[att];

              if (!existObjectId && fld.name === objectIdField) {
                //continue;
                return;
              }
            }
            if (this.initiator && (this.initiator === 'graphic' || this.limitMapExtentCbx.getValue())) {
              if(fld){
                if (fld.name === objectIdField) {
                  this.oidArray.push(oidVal);
                }
              }
            }
            
            var fieldValue = featureAttributes[att];
            value = fieldValue !== null ? String(fieldValue) : "";
            if (value !== "") {
              var isDateField;
              if (fld) {
                isDateField = fld.type === "esriFieldTypeDate";
              }
              if (isDateField) {
                var dateMS = Number(fieldValue);
                if (!isNaN(dateMS)) {
                  if (this._getDateFormat(att, layerIndex) !== "") {
                    value = this._formatDate(dateMS, this._getDateFormat(att, layerIndex));
                  } else {
                    value = this._formatDate(dateMS, 'MM/dd/yyyy');
                  }
                }
              }
              numFormat = this._getNumberFormat(att, layerIndex);
              if (numFormat) {
                args = numFormat.split("|");
                //value,percision,symbol,thousands,decimal
                value = this._formatNumber(fieldValue, args[0] || null, args[1] || null, args[2] || null);
              }
              currFormat = this._getCurrencyFormat(att, layerIndex);
              if (currFormat) {
                args2 = currFormat.split("|");
                //value,percision,symbol,thousands,decimal
                value = this._formatCurrency(fieldValue, args2[1] || null, args2[0] || null, args2[2] || null, args2[3] || null);
              }
              var typeID = typeIdField ? featureAttributes[typeIdField] : null;
              if (att === typeIdField) {
                var featureType = this._getFeatureType(this.resultLayers[layerIndex], typeID);
                if (featureType && featureType.name) {
                  value = featureType.name;
                }
              } else {
                var codedValue = this._getCodedValue(this.resultLayers[layerIndex], att, fieldValue, null);
                if (codedValue) {
                  value = codedValue.name;
                }
              }
            }

            var upperCaseFieldName = att.toUpperCase();
            if (titlefield && upperCaseFieldName === titlefield.toUpperCase()) {
              title = value;
            } else {
              if (this._isVisible(att, layerIndex)) {
                if(lyrHideNullValues && (value === "" || value == 'undefined')){
                  console.log("Removed " + att);
                }else{
                  content = content + this.resultFormatString.replace('[attribname]', this._getAlias(att, layerIndex)).replace('[attribvalue]', value);
                  if (!this._isPopupOnly(att, layerIndex)) {
                    rsltcontent = rsltcontent + this.resultFormatString.replace('[attribname]',
                      this._getAlias(att, layerIndex)).replace('[attribvalue]', value);
                  }
                }
              }
            }
          }));
          if (content.lastIndexOf('<br>') === (content.length - 4)) {
            content = content.substr(0, content.length - 4);
          } else {
            content = content;
          }
          if (rsltcontent.lastIndexOf('<br>') === (rsltcontent.length - 4)) {
            rsltcontent = rsltcontent.substr(0, rsltcontent.length - 4);
          } else {
            rsltcontent = rsltcontent;
          }*/

          var symbol = currentLayer.renderer.getSymbol(results.features[i]);
          
          //oidVal = i + listLen;
          if(!removing){
            csvData.push(csvRow);
            this.list.add({
              id: "id_" + i + listLen,
              OID: oidVal,
              title: title,
              //content: content,
              //rsltcontent: rsltcontent,
              alt: (i % 2 === 0),
              sym: symbol,
              //links: lyrQLinks,
              removeResultMsg: this.nls.removeResultMsg,
              showRelate: layerConfig.relates && layerConfig.relates.relate,
              relalias: this.nls.showrelates
            });
          }else{
            var index = this._returnListIndexFromOID(oidVal);
            if(index > -1){
              this.list.remove(index);
            }
          }
        }
        this.list.addComplete();
        /*this.currentCSVResults = {
          data: csvData,
          columns: csvColumns
        }*/
        html.setStyle(this.btnClear2, 'display', 'block');
        html.setStyle(this.btnClear3, 'display', 'block');
        if(layerIndex < 9){
          this._drawResults(layerIndex, results, currentLayer, closeOnComplete);  
        }
        else{
          var layerConfig = this.config.layers[layerIndex];
          this.addlayerToAttributeTable(layerConfig, currentLayer);
        }
      },

      _returnListIndexFromOID: function (OID) {
        var retVal = -1;
        array.some(this.list.items, lang.hitch(this, function(item, index){
          if (item.OID === OID) {
            retVal = index;
            return true;
          }
        }));
        return retVal;
      },

      _setCurentLayerRenderer: function (symFromWhere) {
        if (symFromWhere === 'server') {
          this.resultLayers[this.currentLayerIndex].drawingInfo.renderer.symbol.size = 6;
          return jsonUtil.fromJson(this.resultLayers[this.currentLayerIndex].drawingInfo.renderer);
        } else {
          var symbol,
            type = this.resultLayers[this.currentLayerIndex].geometryType;

          if(symFromWhere === 'layer'){
            var layerConfig = this.config.layers[this.currentLayerIndex];
            if(layerConfig.symbology){
              symbol = symUtils.fromJson(layerConfig.symbology);
              var sRend = new SimpleRenderer(symbol);
              sRend.label = sRend.description = this.config.layers[this.currentLayerIndex].name;
              return sRend;
            }
          }

          //Determine the geometry type to set the symbology
          switch (type) {
          case "esriGeometryMultipoint":
          case "esriGeometryPoint":
            if (this.config.symbols && this.config.symbols.simplemarkersymbol) {
              symbol = new SimpleMarkerSymbol(this.config.symbols.simplemarkersymbol);
            } else {
              if (this.config.symbols && this.config.symbols.picturemarkersymbol) {
                var pms = lang.clone(this.config.symbols.picturemarkersymbol);
                pms.url = this.folderUrl + pms.url;
                symbol = new PictureMarkerSymbol(pms);
              } else {
                symbol = new SimpleMarkerSymbol();
              }
            }
            break;
          case "esriGeometryPolyline":
            if (this.config.symbols && this.config.symbols.simplelinesymbol) {
              symbol = new SimpleLineSymbol(this.config.symbols.simplelinesymbol);
            } else {
              symbol = new SimpleLineSymbol();
            }
            break;
          case "esriGeometryEnvelope":
          case "esriGeometryPolygon":
            if (this.config.symbols && this.config.symbols.simplefillsymbol) {
              symbol = new SimpleFillSymbol(this.config.symbols.simplefillsymbol);
            } else {
              symbol = new SimpleFillSymbol();
            }
            break;
          default:
            break;
          }
          var simpRend = new SimpleRenderer(symbol);
          simpRend.label = simpRend.description = this.config.layers[this.currentLayerIndex].name;
          return simpRend;
        }
      },

      _openResultInAttributeTable: function (currentLayer) {
        var layerConfig = this.config.layers[this.currentLayerIndex];
        var lyrZoomExistsAndTrue = (layerConfig.hasOwnProperty("autozoomtoresults") && !layerConfig.autozoomtoresults)?false:true;
        if (this.autozoomtoresults && lyrZoomExistsAndTrue) {
          setTimeout(lang.hitch(this, function () {
            this.zoomall();
          }), 300);
        }
        
        //Adjust field info based on config
        //if(!layerConfig.fields.all){
          var adjFldInfos = [];
          var fieldsselected = this.fieldselectdropdown.getOptions();
          for (var i = 0, len = fieldsselected.length; i < len; i++) {
            if(fieldsselected[i].selected){
              adjFldInfos.push({
                fieldName: fieldsselected[i].value,
                label: fieldsselected[i].value,
                show: true,
                format: true
              });
            }
          }
          /*array.map(layerInfo.layerObject.fields, lang.hitch(this, function (fieldInfo){
            var cnfgFldObj = true; //this._getConfigFieldObject(fieldInfo.name, this.currentLayerIndex);
            if(cnfgFldObj){
              adjFldInfos.push({
                fieldName: cnfgFldObj.name,
                label: cnfgFldObj.alias,
                show: true,
                format: this._convertFormatInfo(cnfgFldObj)
              });
            }
          }));*/
        //}
        if(this.layerValueforFieldArray>8){
          var index4layer = 13;//stage 9

          if(this.layerValueforFieldArray == 10){
            index4layer = 20; //gear
          }
          else if(this.layerValueforFieldArray == 11){
            index4layer = 21;//taxon
          }
          else if(this.layerValueforFieldArray == 12){
            index4layer = 11;// preserv
          }
          else if(this.layerValueforFieldArray == 13){
            index4layer = 22;// species
          }
          else if(this.layerValueforFieldArray == 14){
            index4layer = 10; //flow
          }
          else if(this.layerValueforFieldArray == 15){
            index4layer = 12;//project
          }
          else if(this.layerValueforFieldArray == 16){
            index4layer = 19;//cruise
          }
          var layerInfo = this.operLayerInfos.getTableInfoById("EcoDAAT Layers_"+String(index4layer));
          layerInfo['originOperLayer'] = {};
          layerInfo.originOperLayer.popupInfo = {
            fieldInfos: adjFldInfos
          }
        }else{
          var layerInfo = this.operLayerInfos.getLayerInfoById(currentLayer.id);
          layerInfo.originOperLayer.popupInfo = {
            fieldInfos: adjFldInfos
          }
        }
        

        this.publishData({
          'target': 'AttributeTable',
          'layer': layerInfo
        });
      },

      _convertFormatInfo: function(configFldInfo){
        var result = null;
        if(configFldInfo.currencyformat){
          var cOps = configFldInfo.currencyformat.split("|");
          result = {
            places: parseInt(cOps[1] || 0),
            digitSeparator: ((cOps[2])? true : false)
          };
        }
        if(configFldInfo.dateformat){
          var dFormat;
          switch (configFldInfo.dateformat){
            case "M/d/yyyy":
              dFormat = "shortDate";
              break;
            case "d MMM yyyy":
              dFormat = "dayShortMonthYear";
              break;
            case "EEEE, MMMM d, yyyy":
              dFormat = "longDate";
              break;
            case "MMMM d, yyyy":
              dFormat = "longMonthDayYear";
              break;
            case "MMMM yyyy":
              dFormat = "longMonthYear";
              break;
            case "M/d/yyyy h:mm:ss a":
              dFormat = "shortDateLongTime";
              break;
            case "M/d/yyyy H:mm:ss":
              dFormat = "shortDateLongTime24";
              break;
            case "M/d/yyyy h:mm a":
              dFormat = "shortDateShortTime";
              break;
            case "M/d/yyyy h:mm":
              dFormat = "shortDateShortTime24";
              break;
            case "MMM yyyy":
              dFormat = "shortMonthYear";
              break;
            case "yyyy":
              dFormat = "year";
              break;
            default:
              dFormat = "shortDate";
              break;
          }
          result = {
            dateFormat: dFormat
          };
          if(configFldInfo.useutc){
            result.timezone = "utc"
          }
        }
        if(configFldInfo.numberformat){
          var nOps = configFldInfo.numberformat.split("|");
          result = {
            places: parseInt(nOps[0] || 0),
            digitSeparator: ((nOps[1])? true : false)
          };
        }
        return result;
      },

      _getFeatureType: function (layer, typeID) {
        var result;
        if (layer) {
          for (var t = 0; t < layer.types.length; t++) {
            var featureType = layer.types[t];
            if (typeID === featureType.id) {
              result = featureType;
              break;
            }
          }
        }
        return result;
      },

      _getCodedValue: function (layer, fieldName, fieldValue, typeID) {
        var result;
        var codedValueDomain;
        if (typeID) {
          var featureType = this._getFeatureType(layer, typeID);
          if (featureType) {
            codedValueDomain = featureType.domains[fieldName];
          }
        } else {
          var field = this._getField(layer, fieldName);
          if (field) {
            codedValueDomain = field.domain;
          }
        }
        if (codedValueDomain) {
          if (codedValueDomain.type === 'codedValue') {
            for (var cv = 0; cv < codedValueDomain.codedValues.length; cv++) {
              var codedValue = codedValueDomain.codedValues[cv];
              if (fieldValue === codedValue.code) {
                result = codedValue;
                break;
              }
            }
          }
        }
        return result;
      },

      _getField: function (layer, fieldName) {
        var result;
        if (layer) {
          for (var f = 0; f < layer.fields.length; f++) {
            var field = layer.fields[f];
            if (fieldName === field.name) {
              result = field;
              break;
            }
          }
        }
        return result;
      },

      _formatDate: function (value, dateFormat) {
        if (dateFormat) {
          dateFormat = dateFormat.replace(/D/g, "d").replace(/Y/g, "y");
        }
        var inputDate = new Date(value);
        return locale.format(inputDate, {
          selector: 'date',
          datePattern: dateFormat
        });
      },

      _getAlias: function (att, layerIndex) {
        var field = this.config.layers[layerIndex].fields.field;
        var item;
        for (var i in field) {
          item = field[i];
          if (item && item.name && item.name.toLowerCase() === att.toLowerCase() && item.alias) {
            return item.alias;
          }
        }
        return att;
      },

      _isVisible: function (att, layerIndex) {
        var field = this.config.layers[layerIndex].fields.field;
        var item;
        for (var i in field) {
          item = field[i];
          if (item && item.name && item.name.toLowerCase() === att.toLowerCase()) {
            if (item.hasOwnProperty('visible') && item.visible === false) {
              return false;
            } else {
              return true;
            }
          }
        }
        return true;
      },

      _isPopupOnly: function (att, layerIndex) {
        var field = this.config.layers[layerIndex].fields.field;
        var item;
        for (var i in field) {
          item = field[i];
          if (item && item.name && item.name.toLowerCase() === att.toLowerCase()) {
            if (item.hasOwnProperty('popuponly') && item.popuponly === true) {
              return true;
            } else {
              return false;
            }
          }
        }
        return false;
      },

      _getDateFormat: function (att, layerIndex) {
        var field = this.config.layers[layerIndex].fields.field;
        var item;
        for (var i in field) {
          item = field[i];
          if (item && item.name && item.name.toLowerCase() === att.toLowerCase() && item.dateformat) {
            return item.dateformat;
          }
        }
        return "";
      },

      _getCurrencyFormat: function (att, layerIndex) {
        var field = this.config.layers[layerIndex].fields.field;
        var item;
        for (var i in field) {
          item = field[i];
          if (item && item.name && item.name.toLowerCase() === att.toLowerCase() && item.currencyformat) {
            return item.currencyformat;
          }
        }
        return null;
      },

      _formatCurrency: function (value, percision, symbol, thousand, decimal) {
        value = value || 0;
        percision = !isNaN(percision = Math.abs(percision)) ? percision : 2;
        symbol = symbol !== undefined ? symbol : "$";
        thousand = thousand || ",";
        decimal = decimal || ".";
        var negative = value < 0 ? "-" : "",
          i = parseInt(value = Math.abs(+value || 0).toFixed(percision), 10) + "",
          j = (j = i.length) > 3 ? j % 3 : 0;
        return symbol + negative + (j ? i.substr(0, j) + thousand : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thousand) +
          (percision ? decimal + Math.abs(value - i).toFixed(percision).slice(2) : "");
      },

      _getNumberFormat: function (att, layerIndex) {
        var field = this.config.layers[layerIndex].fields.field;
        var item;
        for (var i in field) {
          item = field[i];
          if (item && item.name && item.name.toLowerCase() === att.toLowerCase() && item.numberformat) {
            return item.numberformat;
          }
        }
        return null;
      },

      _formatNumber: function (value, percision, thousand, decimal) {
        value = value || 0;
        percision = !isNaN(percision = Math.abs(percision)) ? percision : 2;
        thousand = thousand || ",";
        decimal = decimal || ".";
        var negative = value < 0 ? "-" : "",
          i = parseInt(value = Math.abs(+value || 0).toFixed(percision), 10) + "",
          j = (j = i.length) > 3 ? j % 3 : 0;
        return negative + (j ? i.substr(0, j) + thousand : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thousand) +
          (percision ? decimal + Math.abs(value - i).toFixed(percision).slice(2) : "");
      },

      _drawResults: function (layerIndex, results, currentLayer, closeOnComplete) {
        var layerConfig = this.config.layers[layerIndex];
        
        if (this.graphicsLayerBuffer instanceof FeatureLayer) {
          this._addOperationalLayer(this.graphicsLayerBuffer);
        }
        var type, centerpoint;
        for (var i = 0, len = this.currentFeatures.length; i < len; i++) {
          var feature = this.currentFeatures[i];
          var listItem = this.list.items[this._returnListIndexFromOID(feature.attributes[layerConfig.objectIdField])];
          //var listItem = this.list.items[this._returnListIndexFromOID(i)];
          if(feature.geometry){
            /*type = feature.geometry.type;
          
            switch (type) {
              case "multipoint":
              case "point":
                centerpoint = feature.geometry;
                break;
              case "polyline":
                centerpoint = feature.geometry.getPoint(0, 0);
                break;
              case "extent":
              case "polygon":
                centerpoint = feature.geometry.getExtent().getCenter();
                break;
              default:
                break;
            }*/
            //listItem.centerpoint = centerpoint;
            var lyrDisablePopupsAndTrue = (layerConfig.hasOwnProperty("disablePopups") && layerConfig.disablePopups)?true:false;
            if((!this.config.disablePopups && !lyrDisablePopupsAndTrue) && !currentLayer._hasInfoTemplate){
              feature.setInfoTemplate(this._configurePopupTemplate(listItem));
            }
            feature.setSymbol(listItem.sym);
            if (feature.geometry) {
              listItem.graphic = feature;
              currentLayer.add(feature);
            }
          }
          else{
            currentLayer.add(feature);
          }
        }
        this.zoomAttempt = 0;

        if (currentLayer instanceof FeatureLayer) {
          this._addOperationalLayer(currentLayer);
        }
        if (this.mouseovergraphics) {
          on(currentLayer, 'mouse-over', lang.hitch(this, this.onMouseOverGraphic));
        }
        
        /*if(results.features.length < 30000){
          
        }
        else{
          this.operationalLayers.push(currentLayer);
          for (var i = 0, len = this.currentFeatures.length; i < len; i++) {
            var feature = this.currentFeatures[i];
            currentLayer.add(feature);
          }
        }*/
        this.currentLayerAdded = currentLayer;

        this.addlayerToAttributeTable(layerConfig, this.currentLayerAdded);
      },

      addlayerToAttributeTable: function(layerConfig, currentLayer){
        if (layerConfig.shareResult && layerConfig.addToAttrib) {
          if (this.wManager) {
            var widgetCfg = this._getWidgetConfig('AttributeTable');
            if(widgetCfg){
              var attWidget = this.wManager.getWidgetByLabel(widgetCfg.label);
              if(attWidget){
                this.attTableOpenedbySearch = !attWidget.showing;
                this.wManager.openWidget(attWidget);
                attWidget._openTable().then(lang.hitch(this, this._openResultInAttributeTable, currentLayer));
              }else{
                /*Attribute Table Widget is not loaded*/
                this.wManager.loadWidget(widgetCfg).then(lang.hitch(this, function(widget){
                  if(widget){
                    this.attTableOpenedbySearch = true;
                    widget.setPosition(this.getOffPanelWidgetPosition(widget));
                    this.wManager.openWidget(widget);
                    widget._openTable().then(lang.hitch(this, this._openResultInAttributeTable, currentLayer));
                  }
                }));
              }
            }else{
              console.warn('The Attribute Table Widget is not configured in this app.');
              this._zoomAndClose(closeOnComplete);
            }
          }
          /*if (closeOnComplete) {
            setTimeout(lang.hitch(this, function () {
              this.pManager.closePanel(this.id + '_panel');
            }), 500);
          }*/
        } else {
          //this._zoomAndClose(closeOnComplete);
        }
      },

      _zoomAndClose: function (closeOnComplete) {
        var layerConfig = this.config.layers[this.currentLayerIndex];
        var lyrZoomExistsAndTrue = (layerConfig.hasOwnProperty("autozoomtoresults") && !layerConfig.autozoomtoresults)?false:true;
        if (this.autozoomtoresults && lyrZoomExistsAndTrue) {
          setTimeout(lang.hitch(this, function () {
            this.zoomall();
          }), 300);
        }
        if (closeOnComplete) {
          setTimeout(lang.hitch(this, function () {
            this.pManager.closePanel(this.id + '_panel');
          }), 500);
        }
      },

      _getWidgetConfig: function(widgetName){
        var widgetCnfg = null;
        array.some(this.wManager.appConfig.widgetPool.widgets, function(aWidget) {
          if(aWidget.name == widgetName) {
            widgetCnfg = aWidget;
            return true;
          }
          return false;
        });
        if(!widgetCnfg){
          /*Check OnScreen widgets if not found in widgetPool*/
          array.some(this.wManager.appConfig.widgetOnScreen.widgets, function(aWidget) {
            if(aWidget.name == widgetName) {
              widgetCnfg = aWidget;
              return true;
            }
            return false;
          });
        }
        return widgetCnfg;
      },

      getOffPanelWidgetPosition: function(widget){
        var position = {
          relativeTo: widget.position.relativeTo
        };
        var pbox = html.getMarginBox(this.domNode);
        var sbox = this.widgetManager.getWidgetMarginBox(widget);
        var containerBox = html.getMarginBox(position.relativeTo === 'map'?
          this.map.id: jimuConfig.layoutId);

        var top = pbox.t + pbox.h + 1;//put under icon by default
        if(top + sbox.h > containerBox.h){
          position.bottom = containerBox.h - pbox.t + 1;
        }else{
          position.top = top;
        }

        if (window.isRTL) {
          if(pbox.l + pbox.w - sbox.w < 0){
            position.right = 0;
          }else{
            position.right = pbox.l + pbox.w - sbox.w;
          }
        } else {
          if(pbox.l + sbox.w > containerBox.w){
            position.right = 0;
          }else{
            position.left = pbox.l;
          }
        }
        return position;
      },

      _searchResultListByOID: function (OID) {
        var layerConfig = this.config.layers[this.currentLayerIndex];
        var lyrHasPopupDisabled = (layerConfig.hasOwnProperty("disablePopups") && layerConfig.disablePopups)?true:false;
        for (var i = 0; i < this.list.items.length; i++) {
          var item = this.list.items[i];
          var point = item.centerpoint;
          if (item.OID === OID) {
            var itemDom = dojo.byId(this.list.id.toLowerCase() + item.id);
            if(itemDom){
              itemDom.scrollIntoView(false);
            }
            this.list.setSelectedItem(this.list.id.toLowerCase() + item.id);
            if ((this.map.infoWindow && this.config.enablePopupsOnResultClick) && !lyrHasPopupDisabled) {
              this.map.infoWindow.setFeatures([item.graphic]);
              if (this.map.infoWindow.reposition) {
                this.map.infoWindow.reposition();
              }
              if(layerConfig.showattachments){
                this._addAttachment(item.OID);
              }
              this.map.infoWindow.show(point);
            }
          }
        }
      },

      onMouseOverGraphic: function (evt) {
        var layerConfig = this.config.layers[this.currentLayerIndex];
        var oidField = layerConfig.objectIdField;
        this._searchResultListByOID(evt.target.e_graphic.attributes[oidField]);
      },

      _configurePopupTemplate: function (listItem) {
        var popUpInfo = {
          title: listItem.title,
          description: listItem.content,
          showAttachments: true
        };
        var pminfos = [];
        var popUpMediaInfo;

        var pt = new PopupTemplate(popUpInfo);
        return pt;
      },

      _selectResultItem: function (index, item) {
        if(this.currentLayerIndex< 9){
          var FeatLyr = new FeatureLayer(this.resultLayers[this.currentLayerIndex]._origLayerURL);
          var point = item.centerpoint;
          var layerConfig = this.config.layers[this.currentLayerIndex];
          var lyrHasPopupDisabled = (layerConfig.hasOwnProperty("disablePopups") && layerConfig.disablePopups)?true:false;
          var zoomScale = layerConfig.zoomScale || 10000;
          if (item.graphic.geometry.type === "point") {
            if ((this.map.getScale() > zoomScale || layerConfig.forceZoomScale) && !lyrHasPopupDisabled) {
              this.map.setScale(zoomScale).then(lang.hitch(this, this.map.centerAt(point).then(lang.hitch(this, function () {
                if (this.map.infoWindow && this.config.enablePopupsOnResultClick) {
                  this.map.infoWindow.setFeatures([item.graphic]);
                  if (this.map.infoWindow.reposition) {
                    this.map.infoWindow.reposition();
                  }
                  if(layerConfig.showattachments){
                    this._addAttachment(item.OID);
                  }
                  this.map.infoWindow.show(point);
                }
              }))));
            } else {
              this.map.centerAt(point).then(lang.hitch(this, function () {
                if ((this.map.infoWindow && this.config.enablePopupsOnResultClick) && !lyrHasPopupDisabled) {
                  this.map.infoWindow.setFeatures([item.graphic]);
                  if (this.map.infoWindow.reposition) {
                    this.map.infoWindow.reposition();
                  }
                  if(layerConfig.showattachments){
                    this._addAttachment(item.OID);
                  }
                  this.map.infoWindow.show(point);
                }
              }));
            }
          } else {
            var gExt = graphicsUtils.graphicsExtent([item.graphic]);
            if (gExt && !layerConfig.forceZoomScale) {
              this.map.setExtent(gExt.expand(.9), true).then(lang.hitch(this, function () {
                if ((this.map.infoWindow && this.config.enablePopupsOnResultClick) && !lyrHasPopupDisabled) {
                  this.map.infoWindow.setFeatures([item.graphic]);
                  if (this.map.infoWindow.reposition) {
                    this.map.infoWindow.reposition();
                  }
                  if(layerConfig.showattachments){
                    this._addAttachment(item.OID);
                  }
                  this.map.infoWindow.show(point);
                }
              }));
            } else {
              if (this.map.getScale() > zoomScale || layerConfig.forceZoomScale) {
                this.map.setScale(zoomScale).then(lang.hitch(this, this.map.centerAt(point).then(lang.hitch(this, function () {
                  if ((this.map.infoWindow && this.config.enablePopupsOnResultClick) && !lyrHasPopupDisabled) {
                    this.map.infoWindow.setFeatures([item.graphic]);
                    if (this.map.infoWindow.reposition) {
                      this.map.infoWindow.reposition();
                    }
                    if(layerConfig.showattachments){
                      this._addAttachment(item.OID);
                    }
                    this.map.infoWindow.show(point);
                  }
                }))));
              } else {
                this.map.centerAt(point).then(lang.hitch(this, function () {
                  if ((this.map.infoWindow && this.config.enablePopupsOnResultClick) && !lyrHasPopupDisabled) {
                    this.map.infoWindow.setFeatures([item.graphic]);
                    if (this.map.infoWindow.reposition) {
                      this.map.infoWindow.reposition();
                    }
                    if(layerConfig.showattachments){
                      this._addAttachment(item.OID);
                    }
                    this.map.infoWindow.show(point);
                  }
                }));
              }
            }
          }
        }
      },

      _addAttachment: function(OID) {
        var ofl = new FeatureLayer(this.resultLayers[this.currentLayerIndex]._origLayerURL);
        ofl.queryAttachmentInfos(OID, lang.hitch(this, function(info){
          if(info.length > 0){
            var domAttSec = dojoQuery(".attachmentsSection", this.map.infoWindow.domNode)[0];
            var aWidget = dijit.getEnclosingWidget(domAttSec);
            array.map(info, lang.hitch(this, function(att){
              var attLi = domConstruct.toDom('<li><a href="' + att.url + '" target="_blank">' + att.name +'</a></li>');
              domConstruct.place(attLi, aWidget._attachmentsList);
            }));
            domClass.remove(domAttSec,'hidden');
            aWidget = null;
          }
        }));
        ofl = null;
      },

      _hideInfoWindow: function () {
        if (this.map && this.map.infoWindow) {
          this.map.infoWindow.hide();
        }
      }

    });
  });
