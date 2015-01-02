////////////////////////////////////////////////////////////////////////////////
//
// Copyright (c) 2010 ESRI
//
// All rights reserved under the copyright laws of the United States.
// You may freely redistribute and use this software, with or
// without modification, provided you include the original copyright
// and use restrictions.  See use restrictions in the file:
// <install location>/License.txt
//
////////////////////////////////////////////////////////////////////////////////
package com.esri.viewer.components.toc_legend.tocClasses
{
	import com.esri.ags.Map;
	import com.esri.ags.esri_internal;
	import com.esri.ags.events.DetailsEvent;
	import com.esri.ags.events.ExtentEvent;
	import com.esri.ags.events.FeatureLayerEvent;
	import com.esri.ags.events.LayerEvent;
	import com.esri.ags.geometry.Extent;
	import com.esri.ags.layers.ArcGISDynamicMapServiceLayer;
	import com.esri.ags.layers.ArcGISTiledMapServiceLayer;
	import com.esri.ags.layers.ArcIMSMapServiceLayer;
	import com.esri.ags.layers.FeatureLayer;
	import com.esri.ags.layers.KMLLayer;
	import com.esri.ags.layers.Layer;
	import com.esri.ags.layers.supportClasses.AllDetails;
	import com.esri.ags.layers.supportClasses.KMLFeatureInfo;
	import com.esri.ags.layers.supportClasses.KMLFolder;
	import com.esri.ags.layers.supportClasses.LayerDetails;
	import com.esri.ags.layers.supportClasses.LayerInfo;
	import com.esri.ags.layers.supportClasses.LayerLegendInfo;
	import com.esri.ags.layers.supportClasses.LegendItemInfo;
	import com.esri.ags.renderers.*;
	import com.esri.ags.symbols.SimpleFillSymbol;
	import com.esri.ags.symbols.SimpleLineSymbol;
	import com.esri.ags.symbols.SimpleMarkerSymbol;
	import com.esri.ags.utils.GraphicUtil;
	import com.esri.ags.utils.JSONUtil;
	import com.esri.viewer.AppEvent;
	import com.esri.viewer.ViewerContainer;
	
	import flash.display.Loader;
	import flash.events.Event;
	import flash.net.URLRequest;
	import flash.system.LoaderContext;
	import flash.utils.ByteArray;
	import flash.utils.clearTimeout;
	import flash.utils.setTimeout;
	
	import mx.collections.ArrayCollection;
	import mx.collections.ArrayList;
	import mx.controls.Alert;
	import mx.controls.Image;
	import mx.core.FlexGlobals;
	import mx.events.CollectionEvent;
	import mx.events.FlexEvent;
	import mx.events.PropertyChangeEvent;
	import mx.rpc.AsyncResponder;
	import mx.rpc.Responder;
	import mx.rpc.events.FaultEvent;
	import mx.rpc.events.ResultEvent;
	import mx.rpc.http.HTTPService;
	import mx.utils.Base64Decoder;
	import mx.utils.GraphicsUtil;
	import mx.utils.ObjectUtil;
	
	import com.esri.viewer.components.toc_legend.tocClasses.*;
	import com.esri.viewer.components.toc_legend.utils.MapUtil;
	
	/**
	 * A TOC item representing a map service or graphics layer.
	 */
	public class TocMapLayerItem extends TocItem
	{
	    private var _isMSOnly:Boolean = false;
		private var _isVisibleLayersSet:Boolean = false;
	
	    public function TocMapLayerItem(layer:Layer, labelFunction:Function = null, isMapServiceOnly:Boolean = false, excludedLayers:ArrayCollection = null, iscollapsed:Boolean = false, _metatooltip:String = "", isdisableZoomTo:Boolean = false)
	    {
	        super();
			_legendData = new ArrayCollection([]);
	        _layer = layer;
			_map = ViewerContainer.getInstance().mapManager.map;
			collapsed =_iscollapsed = iscollapsed;
			disableZoomTo = _disableZoomTo = isdisableZoomTo;
			_excludedLayers = excludedLayers;
	        _isMSOnly = isMapServiceOnly;
	        // Set the initial visibility without causing a layer refresh
	        setVisible(layer.visible, false);
			
			// check if the visiblelayers was set on the dynamic map servicelayer
			var opLayers:Array = ViewerContainer.getInstance().configData.opLayers;
			for (var i:int = 0; i < opLayers.length;){
				if (layer is ArcGISDynamicMapServiceLayer && (layer.id == opLayers[i].label) && opLayers[i].visibleLayers){
					_isVisibleLayersSet = true;
					break;
				}else{
					i++;
				}
			}
	
	        if (labelFunction == null)
	            labelFunction = MapUtil.labelLayer;
			
	        _labelFunction = labelFunction;
	        label = labelFunction(layer);
	
	        if (!isMapServiceOnly){
	            if (layer.loaded){
					if (layer is FeatureLayer){
						var fl:FeatureLayer = layer as FeatureLayer;
						minScale = fl.minScale;
						maxScale = fl.maxScale;
						layerExtent = fl.layerDetails.extent;
					}
	                // Process the layer info immediately
					getLegendData(layer);
	                createChildren();
	            }
	        }
			if(!layer.loaded && layer.loadFault){
				FlexGlobals.topLevelApplication.dispatchEvent(new Event("legendDataLoaded$"));
			}else if (opLayers.length == 0){
				FlexGlobals.topLevelApplication.dispatchEvent(new Event("legendDataLoaded$"));
			}else if(!layer.loaded && layer.name == "dummy"){
				FlexGlobals.topLevelApplication.dispatchEvent(new Event("legendDataLoaded$"));
			}
	
	        // Listen for future layer load events
	        layer.addEventListener(LayerEvent.LOAD, onLayerLoad, false, 0, true);
	
	        // Listen for changes in layer visibility
	        layer.addEventListener(FlexEvent.SHOW, onLayerShow, false, 0, true);
	        layer.addEventListener(FlexEvent.HIDE, onLayerHide, false, 0, true);
			
			ViewerContainer.getInstance().mapManager.map.addEventListener(ExtentEvent.EXTENT_CHANGE,checkExtent);
	    }
	
	    private var _layer:Layer;
		
		private var _legendDataLoaded:Boolean;
		
		private var _iscollapsed:Boolean;
		
		private var _disableZoomTo:Boolean;
		
		private var _legendData:ArrayCollection;
	
	    private var _labelFunction:Function;
		
		private var _map:Map;
		
		private var _excludedLayers:ArrayCollection;
		
		public var  visibleLayers:Array;
		
		[Bindable]
		private var lTimeout:int = 60;
	
	    //--------------------------------------------------------------------------
	    //  Property:  mapLayer
	    //--------------------------------------------------------------------------
	
	    /**
	     * The map layer to which this TOC item is attached.
	     */
	    public function get layer():Layer
	    {
	        return _layer;
	    }
		
		public function getLegendDataByLayerID(layerID:int):LegendDataItem
		{
			for each (var legendData:LegendDataItem in _legendData){
				if (legendData.id == layerID){
					return legendData;
				}
			}
			return null;
		}
		
		public function getLegendDataByLayerName(layerName:String):LegendDataItem
		{
			for each (var legendData:LegendDataItem in _legendData){
				if (legendData.lname == layerName)
					return legendData;
			}
			return null;
		}
		
		public function get legendData():ArrayCollection
		{
			return _legendData;
		}
	
	    /**
	     * @private
	     */
	    override internal function refreshLayer():void
	    {
	        layer.visible = visible;
	
	        // ArcIMS requires layer names, whereas ArcGIS Server requires layer IDs
	        var useLayerInfoName:Boolean = (layer is ArcIMSMapServiceLayer);
	
	        var visLayers:Array = [];
	        for each (var child:TocItem in children){
	            accumVisibleLayers(child, visLayers, useLayerInfoName);
	        }
	
	        if (layer is ArcGISDynamicMapServiceLayer){
				ArcGISDynamicMapServiceLayer(layer).visibleLayers = new ArrayCollection(visLayers);
				ArcGISDynamicMapServiceLayer(layer).visibleLayers.removeEventListener(CollectionEvent.COLLECTION_CHANGE, visibleLayersChangeHandler);
				ArcGISDynamicMapServiceLayer(layer).visibleLayers.addEventListener(CollectionEvent.COLLECTION_CHANGE, visibleLayersChangeHandler);
			}
	        else if (layer is ArcIMSMapServiceLayer)
	            ArcIMSMapServiceLayer(layer).visibleLayers = new ArrayCollection(visLayers);			
	    }
		
		public function manualRefresh():void
		{
			refreshLayer();
		}
		
		private function visibleLayersChangeHandler(event:CollectionEvent):void
		{   
			if (layer.visible){   
				var layerInfos:Array=[];           
				// get the actual visible layers           
				var actualVisibleLayers:Array = getActualVisibleLayers(ArcGISDynamicMapServiceLayer(layer).visibleLayers.toArray(), ArcGISDynamicMapServiceLayer(layer).layerInfos.slice());
				for each (var child:TocLayerInfoItem in children){   
					updateTOCItemVisibility(child, actualVisibleLayers);                              
				}            
			}
		}
		
		private function updateTOCItemVisibility(item:TocLayerInfoItem, actualVisibleLayers:Array):void
		{
			if (item.isGroupLayer()){   
				item.visible = actualVisibleLayers.indexOf(item.layerInfo.layerId) != -1;
				for each (var child:TocLayerInfoItem in item.children){
					updateTOCItemVisibility(child, actualVisibleLayers);
				}
			}else{
				item.visible = actualVisibleLayers.indexOf(item.layerInfo.layerId) != -1;
			}
		}
	
	    private function accumVisibleLayers(item:TocItem, accum:Array, useLayerInfoName:Boolean = false):void
	    {
			
			if (item.isGroupLayer()){
				// Don't include group layer IDs/names in the visible layer list, since the ArcGIS REST API
				// implicitly turns on all child layers when the group layer is visible. This goes
				// counter to what most users have come to expect from apps, e.g. ArcMap.
				
				if(item.visible){ // only accumulate for a visible group layers
					for each (var child:TocItem in item.children){
						accumVisibleLayers(child, accum, useLayerInfoName);
					}
				}
			}else{ // Leaf layer
	            if (item.visible){
	                if (item is TocLayerInfoItem){
	                    var tli:TocLayerInfoItem = TocLayerInfoItem(item);
	                    accum.push(useLayerInfoName ? tli.layerInfo.name : tli.layerInfo.layerId);
						var layerInfos:Array;
						if (layer is ArcGISDynamicMapServiceLayer){
							if (_isVisibleLayersSet){
								layerInfos = [];
								// get the actual visible layers
								var actualVisibleLayers:Array = getActualVisibleLayers(ArcGISDynamicMapServiceLayer(layer).visibleLayers.toArray(), ArcGISDynamicMapServiceLayer(layer).layerInfos);
								for each (var layerInfo:LayerInfo in ArcGISDynamicMapServiceLayer(layer).layerInfos.slice()){
									if (actualVisibleLayers.indexOf(layerInfo.layerId) != -1)
										layerInfo.defaultVisibility = true;
									else
										layerInfo.defaultVisibility = false;
									layerInfos.push(layerInfo);
								}
							}else{
								layerInfos = ArcGISDynamicMapServiceLayer(layer).layerInfos;
							}
						}
	                }
	            }
	        }
		}
	
	    private function onLayerLoad(event:LayerEvent):void
	    {
	        // Re-label this item, since map layer URL or service name might have changed.
	        label = _labelFunction(layer);
	        if (!_isMSOnly){
				if (layer is FeatureLayer){
					var fl:FeatureLayer = layer as FeatureLayer;
					minScale = fl.minScale;
					maxScale = fl.maxScale;
					layerExtent = fl.layerDetails.extent;
				}
				getLegendData(layer);
	            createChildren();
	        }
	    }
		
		private function getLegendData(m_layer:*):void
		{
			if (_legendDataLoaded)
				return;
			_legendDataLoaded = true;
			
			if (m_layer.hasOwnProperty("url")){
				const url:String = m_layer["url"];
				if (url === null)
					return;
			}else{
				return;
			}
			
			var httpServ:HTTPService = new HTTPService();
			httpServ.requestTimeout = lTimeout;
			var lname:String;
			var lInfos:Array;
			var tURL:String;
			if (m_layer is ArcGISTiledMapServiceLayer){
				if(m_layer.version >= 10.01){
					tURL = ArcGISTiledMapServiceLayer(m_layer).url;
					if(tURL.indexOf("?token=") > 0){
						httpServ.url = ArcGISTiledMapServiceLayer(m_layer).url.replace("?token=", "/legend?f=json&token=");
					}else if(ArcGISTiledMapServiceLayer(m_layer).proxyURL){
						//If layer uses proxy
						httpServ.url = ArcGISTiledMapServiceLayer(m_layer).proxyURL + "?" + ArcGISTiledMapServiceLayer(m_layer).url + "/legend?f=json";
					}else{
						httpServ.url = ArcGISTiledMapServiceLayer(m_layer).url + "/legend?f=json";
					}
					httpServ.resultFormat = "text";
					lname = ArcGISTiledMapServiceLayer(m_layer).id;
					lInfos = ArcGISTiledMapServiceLayer(m_layer).layerInfos;
					httpServ.addEventListener(ResultEvent.RESULT,function(event:ResultEvent):void{processLegend(event,lname,Number.NaN,lInfos,httpServ.url)});
					httpServ.send();
				}else{
					lname = ArcGISTiledMapServiceLayer(m_layer).id;
					ArcGISTiledMapServiceLayer(m_layer).addEventListener(DetailsEvent.GET_ALL_DETAILS_COMPLETE,function(event:DetailsEvent):void{getAllDetailsResult(event,lname)});
					ArcGISTiledMapServiceLayer(m_layer).addEventListener(FaultEvent.FAULT, function(event:Event):void{FlexGlobals.topLevelApplication.dispatchEvent(new Event("legendDataLoaded$"))});
					ArcGISTiledMapServiceLayer(m_layer).getAllDetails();
				}
			}else if (m_layer is ArcGISDynamicMapServiceLayer){
				if(m_layer.version >= 10.01){
					tURL  = ArcGISDynamicMapServiceLayer(m_layer).url;
					if(tURL.indexOf("?token=") > 0){
						httpServ.url = ArcGISDynamicMapServiceLayer(m_layer).url.replace("?token=", "/legend?f=json&token=");
					}else if(ArcGISDynamicMapServiceLayer(m_layer).proxyURL){
						//If layer uses proxy
						httpServ.url = ArcGISDynamicMapServiceLayer(m_layer).proxyURL + "?" + ArcGISDynamicMapServiceLayer(m_layer).url + "/legend?f=json";
					}else if(m_layer.token != ""){
						httpServ.url = ArcGISDynamicMapServiceLayer(m_layer).url + "/legend?f=json&token="+m_layer.token;
					}
					else{
						httpServ.url = ArcGISDynamicMapServiceLayer(m_layer).url + "/legend?f=json";
					}
					httpServ.resultFormat = "text";
					lname = ArcGISDynamicMapServiceLayer(m_layer).id;
					lInfos = ArcGISDynamicMapServiceLayer(m_layer).layerInfos
					httpServ.addEventListener(ResultEvent.RESULT,function(event:ResultEvent):void{processLegend(event,lname,Number.NaN,lInfos,httpServ.url)});
					httpServ.send();
				}else{
					lname = ArcGISDynamicMapServiceLayer(m_layer).id;
					ArcGISDynamicMapServiceLayer(m_layer).addEventListener(DetailsEvent.GET_ALL_DETAILS_COMPLETE,function(event:DetailsEvent):void{getAllDetailsResult(event,lname)});
					ArcGISDynamicMapServiceLayer(m_layer).addEventListener(FaultEvent.FAULT, function(event:Event):void{FlexGlobals.topLevelApplication.dispatchEvent(new Event("legendDataLoaded$"))});
					ArcGISDynamicMapServiceLayer(m_layer).getAllDetails();
				}
			}else if (m_layer is KMLLayer){
				timeOutVar = setTimeout(getKMLLegend, 100, m_layer);
			}else if (m_layer is FeatureLayer){
				var FeatServId:Number = Number.NaN;
				var msName:String = FeatureLayer(m_layer).url.replace("FeatureServer","MapServer");
				if(msName.substring(msName.length - 9) != "MapServer"){
					tURL  = msName.substring(0,msName.lastIndexOf("/"));
					if(tURL.indexOf("?token=") > 0){
						httpServ.url = msName.substring(0,msName.lastIndexOf("/")).replace("?token=", "/legend?f=json&token=");
					}else if(FeatureLayer(m_layer).proxyURL){
						//If layer uses proxy
						httpServ.url = FeatureLayer(m_layer).proxyURL + "?" + msName.substring(0,msName.lastIndexOf("/")) + "/legend?f=json";
					}else{
						httpServ.url = msName.substring(0,msName.lastIndexOf("/")) + "/legend?f=json";
					}
					FeatServId = parseInt(msName.substring(msName.lastIndexOf("/")+ 1));
				}else{
					httpServ.url = msName + "/legend?f=json";
				}
				if(m_layer.layerDetails.version >= 10.01){
					httpServ.resultFormat = "text";
					lname = FeatureLayer(m_layer).id;
					httpServ.addEventListener(ResultEvent.RESULT,function(event:ResultEvent):void{processLegend(event,lname,FeatServId)});
					httpServ.send();
				}else{
					lname = FeatureLayer(m_layer).id;
					getFeatureResult(FeatureLayer(m_layer).layerDetails,lname);
				}
			}else{
				FlexGlobals.topLevelApplication.dispatchEvent(new Event("legendDataLoaded$"));
			}
		}
		
		private var timeOutVar:uint;
		
		private function getKMLLegend(layer:KMLLayer):void
		{
			clearTimeout(timeOutVar);
			layer.getLegendInfos(new AsyncResponder(kmlLegendResult,kmlLegendFault,null));
		}
		
		private function kmlLegendResult(lInfos:Array, token:Object):void
		{
			var llInfo:LayerLegendInfo = lInfos[0] as LayerLegendInfo;
			const layName:LegendDataItem = new LegendDataItem();
			layName.lname = llInfo.layerName;
			layName.id = Number.NaN;
			layName.label = llInfo.layerName;
			layName.minscale = llInfo.minScale;
			layName.maxscale = llInfo.maxScale;
			const lClass:LegendDataClassItem = new LegendDataClassItem();
			for(var ll2:int =0; ll2 < llInfo.legendItemInfos.length; ll2++){
				var lli:LegendItemInfo = llInfo.legendItemInfos[ll2] as LegendItemInfo;
				lClass.symbolitems.push(processRenderer(lli));
				layName.legendGroup.push(lClass);
			}
			_legendData.addItem(layName);
			FlexGlobals.topLevelApplication.dispatchEvent(new Event("legendDataLoaded$"));
		}
		
		private function kmlLegendFault(evt:FaultEvent):void
		{
			trace(evt.message);
			FlexGlobals.topLevelApplication.dispatchEvent(new Event("legendDataLoaded$"));
		}
		
		private function getFeatureResult(event:LayerDetails,lname:String):void
		{
			const lDetails:LayerDetails = event;
			if (!filterOutSubLayer(_map.getLayer(lname),lDetails.id)){
				if(lDetails.drawingInfo){
					//Add the layers name
					const layName:LegendDataItem = new LegendDataItem();
					layName.lname = lname;
					layName.id = lDetails.id;
					layName.label = lDetails.name;
					layName.minscale = lDetails.minScale;
					layName.maxscale = lDetails.maxScale;
					
					if(lDetails.drawingInfo.renderer is com.esri.ags.renderers.UniqueValueRenderer){
						const uv:UniqueValueRenderer = lDetails.drawingInfo.renderer as UniqueValueRenderer;
						var lClass:LegendDataClassItem = new LegendDataClassItem();
						for (var i:int=0; i<uv.infos.length; i++){
							lClass.symbolitems.push(processRenderer(uv.infos[i]));	
						}
						layName.legendGroup.push(lClass);
					}
					
					if(lDetails.drawingInfo.renderer is com.esri.ags.renderers.SimpleRenderer){
						const lClass2:LegendDataClassItem = new LegendDataClassItem();
						const lsi:LegendSymbolItem = processRenderer(lDetails.drawingInfo.renderer);
						if(lsi.image){
							lClass2.image = lsi.image;
						}else{
							lClass2.symbolitems.push(lsi);
						}
						layName.legendGroup.push(lClass2);
					}

					if(lDetails.drawingInfo.renderer is com.esri.ags.renderers.ClassBreaksRenderer){
						const cb:ClassBreaksRenderer = lDetails.drawingInfo.renderer as ClassBreaksRenderer;
						var lClass3:LegendDataClassItem = new LegendDataClassItem();
						for (var j:int=0; j<cb.infos.length; j++){
							lClass3.symbolitems.push(processRenderer(cb.infos[j]));
						}
						layName.legendGroup.push(lClass3);
					}
					_legendData.addItem(layName);
				}
				FlexGlobals.topLevelApplication.dispatchEvent(new Event("legendDataLoaded$"));
			}
		}
		
		private function processRenderer(rend:*):LegendSymbolItem
		{
			const lsi:LegendSymbolItem = new LegendSymbolItem();
			lsi.label =  rend.label;
			if(rend.symbol is com.esri.ags.symbols.SimpleMarkerSymbol){
				if(rend.symbol.style == "circle"){
					const crSMSline:SimpleLineSymbol = new SimpleLineSymbol("solid",rend.symbol.outline.color?rend.symbol.outline.color:0x000000,rend.symbol.outline.alpha?rend.symbol.outline.alpha:1,rend.symbol.outline.width);
					const SMSCircle:SimpleMarkerSymbol = new SimpleMarkerSymbol(rend.symbol.style, rend.symbol.size, rend.symbol.color?rend.symbol.color:0x000000, rend.symbol.alpha?rend.symbol.alpha:1, rend.symbol.xoffset, rend.symbol.yoffset, rend.symbol.angle, crSMSline);
					lsi.uic = SMSCircle.createSwatch(30,18);
				}
				if(rend.symbol.style == "cross"){
					const cSMSline:SimpleLineSymbol = new SimpleLineSymbol("solid",rend.symbol.outline.color?rend.symbol.outline.color:0x000000,rend.symbol.outline.alpha?rend.symbol.outline.alpha:1,rend.symbol.outline.width);
					const SMSCross:SimpleMarkerSymbol = new SimpleMarkerSymbol(rend.symbol.style,rend.symbol.size,rend.symbol.color?rend.symbol.color:0x000000, rend.symbol.alpha?rend.symbol.alpha:1,
						rend.symbol.xoffset, rend.symbol.yoffset,rend.symbol.angle,cSMSline);
					lsi.uic = SMSCross.createSwatch(30,18);
				}
				if(rend.symbol.style == "diamond"){
					const dSMSline:SimpleLineSymbol = new SimpleLineSymbol("solid",rend.symbol.outline.color?rend.symbol.outline.color:0x000000,rend.symbol.outline.alpha?rend.symbol.outline.alpha:1,rend.symbol.outline.width);
					const SMSDiamond:SimpleMarkerSymbol = new SimpleMarkerSymbol(rend.symbol.style,rend.symbol.size,rend.symbol.color?rend.symbol.color:0x000000, rend.symbol.alpha?rend.symbol.alpha:1,
						rend.symbol.xoffset, rend.symbol.yoffset,rend.symbol.angle,dSMSline);
					lsi.uic = SMSDiamond.createSwatch(30,18);
				}
				if(rend.symbol.style == "square"){
					const sSMSline:SimpleLineSymbol = new SimpleLineSymbol("solid",rend.symbol.outline.color?rend.symbol.outline.color:0x000000,rend.symbol.outline.alpha?rend.symbol.outline.alpha:1,rend.symbol.outline.width);
					const SMSSquare:SimpleMarkerSymbol = new SimpleMarkerSymbol(rend.symbol.style,rend.symbol.size,rend.symbol.color?rend.symbol.color:0x000000, rend.symbol.alpha?rend.symbol.alpha:1,
						rend.symbol.xoffset, rend.symbol.yoffset,rend.symbol.angle,sSMSline);
					lsi.uic = SMSSquare.createSwatch(30,18);
				}
				if(rend.symbol.style == "triangle"){
					const tSMSline:SimpleLineSymbol = new SimpleLineSymbol("solid",rend.symbol.outline.color?rend.symbol.outline.color:0x000000,rend.symbol.outline.alpha?rend.symbol.outline.alpha:1,rend.symbol.outline.width);
					const SMSTri:SimpleMarkerSymbol = new SimpleMarkerSymbol(rend.symbol.style,rend.symbol.size,rend.symbol.color?rend.symbol.color:0x000000, rend.symbol.alpha?rend.symbol.alpha:1,
						rend.symbol.xoffset, rend.symbol.yoffset,rend.symbol.angle,tSMSline);
					lsi.uic = SMSTri.createSwatch(30,18);
				}
				if(rend.symbol.style == "x"){
					const xSMSline:SimpleLineSymbol = new SimpleLineSymbol("solid",rend.symbol.outline.color?rend.symbol.outline.color:0x000000,rend.symbol.outline.alpha?rend.symbol.outline.alpha:1,rend.symbol.outline.width);
					const SMSX:SimpleMarkerSymbol = new SimpleMarkerSymbol(rend.symbol.style,rend.symbol.size,rend.symbol.color?rend.symbol.color:0x000000, rend.symbol.alpha?rend.symbol.alpha:1,
						rend.symbol.xoffset, rend.symbol.yoffset,rend.symbol.angle,xSMSline);
					lsi.uic = SMSX.createSwatch(30,18);
				}
			}
			if(rend.symbol is com.esri.ags.symbols.SimpleLineSymbol){
				const line:SimpleLineSymbol = new SimpleLineSymbol(rend.symbol.style,rend.symbol.color?rend.symbol.color:0x000000, rend.symbol.alpha?rend.symbol.alpha:1,rend.symbol.width);
				lsi.uic = line.createSwatch(30, 18);
			}
			if(rend.symbol is com.esri.ags.symbols.SimpleFillSymbol){
				if(rend.symbol.outline){
					const sSFSline:SimpleLineSymbol = new SimpleLineSymbol(rend.symbol.outline.style,rend.symbol.outline.color?rend.symbol.outline.color:0x000000,rend.symbol.outline.alpha?rend.symbol.outline.alpha:1,rend.symbol.outline.width);
				}
				const SFSRect:SimpleFillSymbol = new SimpleFillSymbol(rend.symbol.style,rend.symbol.color?rend.symbol.color:0x000000, rend.symbol.alpha?rend.symbol.alpha:1,sSFSline?sSFSline:null);
				lsi.uic = SFSRect.createSwatch(30,18);
			}
			if(rend.symbol is com.esri.ags.symbols.PictureMarkerSymbol){
				const image:Image = new Image();
				const loader:Loader = new Loader();
				const lc:LoaderContext = new LoaderContext(false);
				loader.contentLoaderInfo.addEventListener(Event.COMPLETE,
				function(e:Event):void
				{ 
					if(rend is LegendItemInfo){
						image.maxHeight = 30;
						image.maxWidth = 30;
					}
					image.smoothBitmapContent = true;
					image.source = e.currentTarget.content;
					image.rotation = rend.symbol.angle;
				});
				
				var match:Array = rend.symbol.source.toString().match(/^\s*((https?|ftp):\/\/\S+)\s*$/i);
				if (match && match.length > 0){
					loader.load(new URLRequest(rend.symbol.source),lc);
				}else{
					loader.loadBytes(rend.symbol.source,lc);
				}
				lsi.image = image;
			}
			return lsi;
		}
		
		private function processLegend(event:ResultEvent,lname:String,inconlythisid:Number = Number.NaN, lInfos:Array = null, sUrl:String = ""):void
		{
			const rawData:String = String(event.result);
			const data:Object = JSONUtil.decode(rawData);
			var lFound:Boolean = false;
			for each (var li:LayerInfo in lInfos){
				for each (var lDetails1:* in data.layers){
					if(lDetails1.layerId == li.layerId){
						lFound = true;
						break;
					}
				}
				if(lFound == false){
					var httpServ:HTTPService = new HTTPService();
					httpServ.url = sUrl.replace("legend", li.layerId.toString());
					httpServ.resultFormat = "text";
					httpServ.addEventListener(ResultEvent.RESULT,function(event:ResultEvent):void{processLayerDetails(event,lname)});
					httpServ.send();
				}
			}
			
			for each (var lDetails:* in data.layers){
				if (!filterOutSubLayer(_map.getLayer(lname),lDetails.layerId)){
					if(!isNaN(inconlythisid) && lDetails.layerId != inconlythisid)
						continue;
					//Add the layers name
					const layName:LegendDataItem = new LegendDataItem();
					layName.lname = lname;
					layName.id = lDetails.layerId;
					layName.label = lDetails.layerName;
					layName.minscale = lDetails.minScale;
					layName.maxscale = lDetails.maxScale;
					
					for (var i:int=0; i<lDetails.legend.length; i++){
						const lClass:LegendDataClassItem = new LegendDataClassItem();
						lClass.label = lDetails.legend[i].label;
						if(lDetails.legend[i].imageData == LegendIconDictionary.GENERICBASEMAP){
							lClass.image = loadImage(LegendIconDictionary.RASTER);
						}else{
							lClass.image = loadImage(lDetails.legend[i].imageData);
						}
						layName.legendGroup.push(lClass);
					}
					
					if(lDetails.legend.length == 0 && lDetails.layerType == "Raster Catalog Layer"){
						const lClass2:LegendDataClassItem = new LegendDataClassItem();
						lClass2.label = lDetails.layerName;
						lClass2.image = loadImage(LegendIconDictionary.RASTERCATALOG);
						layName.legendGroup.push(lClass2);
					}
					_legendData.addItem(layName);
				}
			}
			FlexGlobals.topLevelApplication.dispatchEvent(new Event("legendDataLoaded$"));
		}
		
		private function processLayerDetails(event:ResultEvent, lname:String):void
		{
			const rawData:String = String(event.result);
			const data:Object = JSONUtil.decode(rawData);
			
			const layName:LegendDataItem = new LegendDataItem();
			layName.lname = lname;
			layName.id = data.id;
			
			const lClass:LegendDataClassItem = new LegendDataClassItem();
			if(data.type == "Annotation Sublayer"){
				lClass.label = data.name;
				lClass.image = loadImage(LegendIconDictionary.ANNOTATION);
				layName.legendGroup.push(lClass);
			}else if(data.type == "Raster Catalog Layer"){
				lClass.label = data.name;
				lClass.image = loadImage(LegendIconDictionary.RASTERCATALOG);
				layName.legendGroup.push(lClass);
			}else if(data.type == "Dimension Layer"){
				lClass.label = data.name;
				lClass.image = loadImage(LegendIconDictionary.DIMENSION);
				layName.legendGroup.push(lClass);
			}else if(data.type == "Raster Layer"){
				lClass.label = data.name;
				lClass.image = loadImage(LegendIconDictionary.RASTER);
				layName.legendGroup.push(lClass);
			}
			layName.label = data.name;
			layName.minscale = data.minScale;
			layName.maxscale = data.maxScale;
			_legendData.addItem(layName);
			FlexGlobals.topLevelApplication.dispatchEvent(new Event("legendDataLoaded2$"));
		}
		
		private function loadImage(imageData:String):Image
		{
			const base64Dec:Base64Decoder = new Base64Decoder();
			base64Dec.decode(imageData);
			const byteArr:ByteArray = base64Dec.toByteArray();
			
			const loader:Loader = new Loader();
			const lc:LoaderContext = new LoaderContext(false);
			const image:Image = new Image();
			image.maxHeight = 30;
			image.maxWidth = 30;
			loader.contentLoaderInfo.addEventListener(Event.COMPLETE,
				function(e:Event):void
				{
					image.smoothBitmapContent = true;
					image.source = e.currentTarget.content;
				});
			loader.loadBytes(byteArr, lc);
			return image;
		}
		
		private function getAllDetailsResult(event:DetailsEvent,lname:String):void
		{
			for each (var lDetails:LayerDetails in event.allDetails.layersDetails){
				if (!filterOutSubLayer(_map.getLayer(lname),lDetails.id)){
					if(lDetails.drawingInfo){
						//Add the layers name
						var layName:LegendDataItem = new LegendDataItem();
						layName.lname = lname;
						layName.id = lDetails.id;
						layName.label = lDetails.name;
						layName.minscale = lDetails.minScale;
						layName.maxscale = lDetails.maxScale;
						
						if(lDetails.drawingInfo.renderer is com.esri.ags.renderers.UniqueValueRenderer){
							var uv:UniqueValueRenderer = lDetails.drawingInfo.renderer as UniqueValueRenderer;
							const lClass:LegendDataClassItem = new LegendDataClassItem();
							for (var i:int=0; i<uv.infos.length; i++){
								lClass.symbolitems.push(processRenderer(uv.infos[i]));
							}
							layName.legendGroup.push(lClass);
						}
						if(lDetails.drawingInfo.renderer is com.esri.ags.renderers.SimpleRenderer){
							const lClass2:LegendDataClassItem = new LegendDataClassItem();
							
							var lsi:LegendSymbolItem = processRenderer(lDetails.drawingInfo.renderer);
							if(lsi.image){
								lClass2.image = lsi.image;
							}else{
								lClass2.symbolitems.push(lsi);
							}
							layName.legendGroup.push(lClass2);
						}
						if(lDetails.drawingInfo.renderer is com.esri.ags.renderers.ClassBreaksRenderer){
							var cb:ClassBreaksRenderer = lDetails.drawingInfo.renderer as ClassBreaksRenderer;
							const lClass3:LegendDataClassItem = new LegendDataClassItem();
							for (var j:int=0; j<cb.infos.length; j++){
								lClass3.symbolitems.push(processRenderer(cb.infos[j]));
							}
							layName.legendGroup.push(lClass3);
						}
						_legendData.addItem(layName);
					}
				}
			}
			FlexGlobals.topLevelApplication.dispatchEvent(new Event("legendDataLoaded$"));
		}
	
	    private function onLayerShow(event:FlexEvent):void
	    {
	        setVisible(layer.visible, true);
	    }
		
		private function filterOutSubLayer(layer:Layer, id:int):Boolean
		{
			var exclude:Boolean = false;
			if (layer.name.indexOf("hiddenLayer_") != -1){
				exclude = true;
			}
			if (!exclude && _excludedLayers){
				exclude = false;
				/*for each (var item:* in excludeLayers) {
				var iArr:Array = item.ids?item.ids:new Array;
				var index:int = iArr.indexOf(id.toString());
				if (item.name == layer.id || item.name == layer.name){
				if(index >= 0 || iArr.length == 0){
				exclude = true;
				break;
				}
				}
				}*/
				if(_excludedLayers.contains(layer.name))
				{
					exclude = true;
				}
			}
			return exclude;
		}
	
	    private function onLayerHide(event:FlexEvent):void
	    {
	        setVisible(layer.visible, true);
	    }
	
	    /**
	     * Populates this item's children collection based on any layer info
	     * of the map service.
	     */
	    private function createChildren():void
	    {
	        children = null;
	        var layerInfos:Array; // of LayerInfo
	        var visibleLayers:Array;
	
	        if (layer is ArcGISTiledMapServiceLayer){
	            layerInfos = ArcGISTiledMapServiceLayer(layer).layerInfos;
	        }else if (layer is ArcGISDynamicMapServiceLayer){
				if (_isVisibleLayersSet){
					layerInfos = [];
					// get the actual visible layers
					var actualVisibleLayers:Array = getActualVisibleLayers(ArcGISDynamicMapServiceLayer(layer).visibleLayers.toArray(), ArcGISDynamicMapServiceLayer(layer).layerInfos);
					for each (var layerInfo:LayerInfo in ArcGISDynamicMapServiceLayer(layer).layerInfos.slice()){
						if (actualVisibleLayers.indexOf(layerInfo.layerId) != -1)
							layerInfo.defaultVisibility = true;
						else
							layerInfo.defaultVisibility = false;
						layerInfos.push(layerInfo);
					}
				}else{
					layerInfos = ArcGISDynamicMapServiceLayer(layer).layerInfos;
				}
			}else if (layer is ArcIMSMapServiceLayer){
	            layerInfos = ArcIMSMapServiceLayer(layer).layerInfos;
	        }else if (layer is KMLLayer){
				createKMLLayerTocItems(this, KMLLayer(layer),_excludedLayers, _iscollapsed, _disableZoomTo);
			}else if (layer is FeatureLayer){
				var li:LayerInfo = new LayerInfo();
				li.defaultVisibility = true;
				
				var fl:FeatureLayer = FeatureLayer(layer);
				var FeatServId:Number = Number.NaN;
				var msName:String = fl.url.replace("FeatureServer","MapServer");
				var x:String = msName.substring(msName.length - 9);
				if(msName.substring(msName.length - 9) != "MapServer")
					FeatServId = parseInt(msName.substring(msName.lastIndexOf("/")+ 1));
				if (!isNaN(FeatServId))
					li.layerId = FeatServId;
				else
					li.layerId = 0;
				li.parentLayerId = Number.NaN;
				li.maxScale = fl.maxScale;
				li.minScale = fl.minScale;
				li.name = fl.layerDetails.name;
				
				layerInfos = [li];
			}
	
	        if (layerInfos){
	            var rootLayers:Array = findRootLayers(layerInfos);
	            for each (var layerInfo1:LayerInfo in rootLayers){
					var tlii:TocLayerInfoItem = createTocLayer(this, layerInfo1, layerInfos, visibleLayers, layer, _excludedLayers, _iscollapsed, _disableZoomTo);
	                if (tlii)
						addChild(tlii);
	            }
	        }
	    }
		
		internal static const DEFAULT_EXT:Extent = new Extent();
		
		private var _layerExtent:Extent = DEFAULT_EXT;
		
		public function set layerExtent( value:Extent ):void
		{
			_layerExtent = value;
		}
		
		public function get layerExtent():Extent
		{
			return _layerExtent;
		}
		
		internal static const DEFAULT_MAX:Number = 0;
		
		private var _maxScale:Number = DEFAULT_MAX;
		
		public function set maxScale( value:Number ):void
		{
			_maxScale = value;
			scaledependant = true;
			
			if(_maxScale > 0 && _minScale > 0){
				if ((ViewerContainer.getInstance().mapManager.map.scale >= _maxScale) &&
					(ViewerContainer.getInstance().mapManager.map.scale <= _minScale)){
					scaledependant = false;
				}			
			} else if (_maxScale > 0 ){
				if ((ViewerContainer.getInstance().mapManager.map.scale >= _maxScale)){
					scaledependant = false;
				}
			} else if (_minScale > 0 ) {
				if ((ViewerContainer.getInstance().mapManager.map.scale <= _minScale)){
					scaledependant = false;
				}
			} else {
				scaledependant = false;
			}
		}
		
		public function get maxScale():Number
		{
			return _maxScale;
		}
		
		private function checkExtent(evt:ExtentEvent):void{
			scaledependant = true;
			
			if(_maxScale > 0 && _minScale > 0){
				if ((ViewerContainer.getInstance().mapManager.map.scale >= _maxScale) &&
					(ViewerContainer.getInstance().mapManager.map.scale <= _minScale)){
					scaledependant = false;
				}			
			} else if (_maxScale > 0 ){
				if ((ViewerContainer.getInstance().mapManager.map.scale >= _maxScale)){
					scaledependant = false;
				}
			} else if (_minScale > 0 ) {
				if ((ViewerContainer.getInstance().mapManager.map.scale <= _minScale)){
					scaledependant = false;
				}
			} else {
				scaledependant = false;
			}
		}
		
		private function getActualVisibleLayers(layerIds:Array, layerInfos:Array):Array
		{
			var result:Array = [];
			
			layerIds = layerIds ? layerIds.concat() : null;
			var layerInfo:LayerInfo;
			var layerIdIndex:int;
			
			if (layerIds){
				// replace group layers with their sub layers
				for each (layerInfo in layerInfos){
					layerIdIndex = layerIds.indexOf(layerInfo.layerId);
					if (layerInfo.subLayerIds && layerIdIndex != -1){
						layerIds.splice(layerIdIndex, 1); // remove the group layer id
						for each (var subLayerId:Number in layerInfo.subLayerIds){
							//only add subLayerId if it does not already exist
							if(layerIds.indexOf(subLayerId)== -1)
								layerIds.push(subLayerId); // add subLayerId
						}
					}
				}
				
				//copying layerInfos as Array#reverse() is destructive.
				var reversedLayerInfos:Array = layerInfos.concat();
				reversedLayerInfos.reverse();
				for each (layerInfo in reversedLayerInfos){
					if (layerIds.indexOf(layerInfo.layerId) != -1 && layerIds.indexOf(layerInfo.parentLayerId) == -1 && layerInfo.parentLayerId != -1)
						layerIds.push(layerInfo.parentLayerId);
				}
				result = layerIds;
			}
			return result;
		}
		
		internal static const DEFAULT_MIN:Number = 0;
		
		private var _minScale:Number = DEFAULT_MIN;
		
		public function set minScale( value:Number ):void
		{
			_minScale = value;
			scaledependant = true;
			
			if(_maxScale > 0 && _minScale > 0){
				if ((ViewerContainer.getInstance().mapManager.map.scale >= _maxScale) &&
					(ViewerContainer.getInstance().mapManager.map.scale <= _minScale)){
					scaledependant = false;
				}
			} else if (_maxScale > 0 ){
				if ((ViewerContainer.getInstance().mapManager.map.scale >= _maxScale)){
					scaledependant = false;
				}
			} else if (_minScale > 0 ) {
				if ((ViewerContainer.getInstance().mapManager.map.scale <= _minScale)){
					scaledependant = false;
				}
			} else {
				scaledependant = false;
			}
		}
		
		public function get minScale():Number
		{
			return _minScale;
		}
	
	    private static function findRootLayers(layerInfos:Array):Array // of LayerInfo
	    {
	        var roots:Array = [];
	        for each (var layerInfo:LayerInfo in layerInfos){
	            // ArcGIS: parentLayerId is -1
	            // ArcIMS: parentLayerId is NaN
	            if (isNaN(layerInfo.parentLayerId) || layerInfo.parentLayerId == -1)
	                roots.push(layerInfo);
	        }
	        return roots;
	    }
	
	    private static function findLayerById(id:Number, layerInfos:Array):LayerInfo
	    {
	        for each (var layerInfo:LayerInfo in layerInfos){
	            if (id == layerInfo.layerId)
	                return layerInfo;
	        }
	        return null;
	    }
		
		private static function createKMLLayerTocItems(parentItem:TocItem, layer:KMLLayer, excludeLayers:ArrayCollection = null, iscollapsed:Boolean = false, isDisableZoomTo:Boolean = false):void
		{
			if(layer.folders.length == 0 && layer.networkLinks.length == 0){
				var visibleLayers:Array;
				var layerInfos:Array;
				var li:LayerInfo = new LayerInfo();
				li.defaultVisibility = true;
				li.layerId = 0;
				li.parentLayerId = Number.NaN;
				li.maxScale = layer.maxScale;
				li.minScale = layer.minScale;
				li.name = layer.name;
				layerInfos = [li];
				if (layerInfos){
					var rootLayers:Array = findRootLayers(layerInfos);
					for each (var layerInfo1:LayerInfo in rootLayers){
						var tlii:TocLayerInfoItem = createTocLayer(parentItem, layerInfo1, layerInfos, visibleLayers, layer, excludeLayers, iscollapsed, isDisableZoomTo);
						if (tlii) parentItem.addChild(tlii);
					}
				}
					
			}
			for each (var folder:KMLFolder in layer.folders){
				if (folder.parentFolderId == -1)
					parentItem.addChild(createKmlFolderTocItem(parentItem, folder, layer.folders, layer, excludeLayers, iscollapsed, isDisableZoomTo));
			}
			
			for each (var networkLink:KMLLayer in layer.networkLinks){
				// If the parent folder exists , do not create NetworkLinkItem as it is already created
				if (!(hasParentFolder(Number(networkLink.id), layer.folders))){
					// check if it is loaded
					if (networkLink.loaded)
						parentItem.addChild(createKmlNetworkLinkTocItem(parentItem, networkLink, layer, excludeLayers, iscollapsed, isDisableZoomTo));
					else
						networkLink.addEventListener(LayerEvent.LOAD, networkLinkLoadHandler);
					
					function networkLinkLoadHandler(event:LayerEvent):void
					{
						parentItem.addChild(createKmlNetworkLinkTocItem(parentItem, networkLink, layer, excludeLayers, iscollapsed, isDisableZoomTo));
					}
				}
			}
		}
		
		private static function hasParentFolder(id:Number, folders:Array):Boolean
		{
			// find the immediate parent folder
			var parentFolderFound:Boolean;
			
			for (var i:int = 0; i < folders.length; ){
				for (var j:int = 0; j < KMLFolder(folders[i]).featureInfos.length; ){
					if (id == KMLFolder(folders[i]).featureInfos[j].id){
						parentFolderFound = true;
						break;
					}else{
						j++
					}
				}
				if (parentFolderFound)
					break;
				else
					i++;
			}
			return parentFolderFound;
		}
	
	    private static function createTocLayer(parentItem:TocItem, layerInfo:LayerInfo, layerInfos:Array, visibleLayers:Array, tlayer:Layer, excludeLayers:ArrayCollection, iscollapsed:Boolean, isdisableZoomTo:Boolean):TocLayerInfoItem
	    {
	        const item:TocLayerInfoItem = new TocLayerInfoItem(parentItem, layerInfo, visibleLayers);
			item.scroller = parentItem.scroller;
			item.tocMinWidth = parentItem.tocMinWidth;
			item.disableZoomTo = isdisableZoomTo;
			item.collapsed = iscollapsed;

			function filterOutSubLayer(layer:Layer, id:int):Boolean
			{
				var exclude:Boolean = false;
				if (!exclude && excludeLayers){
					exclude = false;
					/*for each (var item:* in excludeLayers) {
						var iArr:Array = item.ids?item.ids:new Array;
						var index:int = iArr.indexOf(id.toString());
						if (item.name == layer.id || item.name == layer.name){
							if(index >= 0 || iArr.length == 0){
								exclude = true;
								break;
							}
						}
					}*/
					if(excludeLayers.contains(layer.name))
					{
						exclude = true;
					}
				}
				return exclude;
			}
			
			if (filterOutSubLayer(tlayer, layerInfo.layerId))
				return null;
			if(tlayer is ArcIMSMapServiceLayer){
				FlexGlobals.topLevelApplication.dispatchEvent(new Event("legendDataLoaded$"));
			}
			
			if (tlayer is ArcGISTiledMapServiceLayer) {
				ArcGISTiledMapServiceLayer(tlayer).getDetails(layerInfo.layerId, new AsyncResponder(
					function myResultFunction(result:LayerDetails, token:Object = null):void
					{
						item.minScale = result.minScale;
						item.maxScale = result.maxScale;
						item.layerExtent = result.extent;
						if(result.description || result.copyright)
							item.ttooltip = result.description + "\n" + result.copyright;
					},
					function myFaultFunction(error:Object, token:Object = null):void
					{
						//do nothing
					}
				));
			} else if (tlayer is ArcGISDynamicMapServiceLayer) {
				ArcGISDynamicMapServiceLayer(tlayer).getDetails(layerInfo.layerId, new AsyncResponder(
					function myResultFunction(result:LayerDetails, token:Object = null):void
					{
						item.minScale = result.minScale;
						item.maxScale = result.maxScale;
						item.layerExtent = result.extent;
						if(result.description || result.copyright)
							item.ttooltip = result.description + "\n" + result.copyright;
					},
					function myFaultFunction(error:Object, token:Object = null):void
					{
						//do nothing
					}
				));
			} else if (tlayer is FeatureLayer){
				var fl:FeatureLayer = FeatureLayer(tlayer)
				item.minScale = fl.minScale;
				item.maxScale = fl.maxScale;
				item.layerExtent = fl.layerDetails.extent;
				if(fl.layerDetails.description || fl.layerDetails.copyright)
					item.ttooltip = fl.layerDetails.description + "\n" + fl.layerDetails.copyright;
			}
	
	        // Handle any sublayers of a group layer
	        if (layerInfo.subLayerIds){
	            for each (var childId:Number in layerInfo.subLayerIds){
	                var childLayer:LayerInfo = findLayerById(childId, layerInfos);
	                if (childLayer){
						var tlii:TocLayerInfoItem = createTocLayer(item, childLayer, layerInfos, visibleLayers, tlayer, excludeLayers, iscollapsed, isdisableZoomTo);
						if (tlii) item.addChild(tlii);
	                }
	            }
	        }
	        return item;
	    }
		
		private static function createKmlFolderTocItem(parentItem:TocItem, folder:KMLFolder, folders:Array, layer:KMLLayer, excludeLayers:ArrayCollection, iscollapsed:Boolean, disableZoomTo:Boolean):TocKmlFolderItem
		{
			var item:TocKmlFolderItem = new TocKmlFolderItem(parentItem, folder, layer);
			
			// Handle any sublayers of a group layer
			if (folder.subFolderIds && folder.subFolderIds.length > 0){
				var lookInFeatureInfos:Boolean = true;
				for each (var childId:Number in folder.subFolderIds){
					var childFolder:KMLFolder = findFolderById(childId, folders);
					if (childFolder)
						item.addChild(createKmlFolderTocItem(item, childFolder, folders, layer, excludeLayers, iscollapsed, disableZoomTo));
				}
			}else if (folder.featureInfos && folder.featureInfos.length > 0){
				for each (var featureInfo:KMLFeatureInfo in folder.featureInfos){
					if (featureInfo.type == KMLFeatureInfo.NETWORK_LINK){
						var networkLink:KMLLayer = layer.getFeature(featureInfo) as KMLLayer;
						item.addChild(createKmlNetworkLinkTocItem(item, networkLink, layer, excludeLayers, iscollapsed, disableZoomTo));
					}
				}
			}
			return item;
		}
		
		private static function createKmlNetworkLinkTocItem(item:TocItem, networkLink:KMLLayer, layer:KMLLayer, excludeLayers:ArrayCollection, iscollapsed:Boolean, disableZoomTo:Boolean):TocKmlNetworkLinkItem
		{
			var tocKmlNetworkLinkItem:TocKmlNetworkLinkItem = new TocKmlNetworkLinkItem(item, networkLink, layer);
			if (networkLink.loaded)
				createKMLLayerTocItems(tocKmlNetworkLinkItem, networkLink, excludeLayers, iscollapsed, disableZoomTo); // as network link is also a type of KMLLayer
			else
				networkLink.addEventListener(LayerEvent.LOAD, layerLoadHandler);
			
			function layerLoadHandler(event:LayerEvent):void
			{
				createKMLLayerTocItems(tocKmlNetworkLinkItem, networkLink, excludeLayers, iscollapsed, disableZoomTo);
			}
			
			return tocKmlNetworkLinkItem;
		}
		
		private static function findFolderById(id:Number, allFolders:Array):KMLFolder
		{
			var match:KMLFolder;
			
			for (var i:int = 0; i < allFolders.length;){
				if (allFolders[i].id == id){
					match = allFolders[i] as KMLFolder;
					break;
				}else{
					i++;
				}
			}
			return match;
		}
	}
}