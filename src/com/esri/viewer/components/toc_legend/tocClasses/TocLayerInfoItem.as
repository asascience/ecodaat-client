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

	import com.esri.ags.events.ExtentEvent;
	import com.esri.ags.geometry.Extent;
	import com.esri.ags.layers.KMLLayer;
	import com.esri.ags.layers.supportClasses.LayerInfo;
	import com.esri.ags.symbols.*;
	import com.esri.viewer.ViewerContainer;
	
	import flash.display.Bitmap;
	import flash.display.BitmapData;
	import flash.display.Loader;
	import flash.events.Event;
	import flash.system.LoaderContext;
	import flash.utils.ByteArray;
	
	import mx.containers.HBox;
	import mx.containers.VBox;
	import mx.controls.Image;
	import mx.core.FlexGlobals;
	import mx.core.UIComponent;
	import mx.events.FlexEvent;
	import mx.utils.Base64Decoder;
	
	import spark.components.Group;
	import spark.components.HGroup;
	import spark.components.Label;
	import spark.components.VGroup;
	import spark.primitives.BitmapImage;
	
	/**
	 * A TOC item representing a member layer of an ArcGIS or ArcIMS map service.
	 * This includes group layers that contain other member layers.
	 */
	public class TocLayerInfoItem extends TocItem
	{
	    public function TocLayerInfoItem(parentItem:TocItem, layerInfo:LayerInfo, visibleLayers:Array)
	    {
	        super(parentItem);
	
	        _layerInfo = layerInfo;
	        label = layerInfo.name;
	
	        // Set the initial visibility without causing a layer refresh
	        if (visibleLayers){
	            if (visibleLayers.indexOf(layerInfo.layerId) == -1)
	                setVisible(false, false); // set visible to false
	        }else{
	            setVisible(layerInfo.defaultVisibility, false);
	        }
			
			ViewerContainer.getInstance().mapManager.map.addEventListener(ExtentEvent.EXTENT_CHANGE,checkExtent);
	    }
		
		internal static const DEFAULT_MAX:Number = 0;
		
		private var _maxScale:Number = DEFAULT_MAX;
		
		public function set maxScale( value:Number ):void
		{
			_maxScale = value;
			this.scaledependant = true;
			
			if(_maxScale > 0 && _minScale > 0){
				if ((ViewerContainer.getInstance().mapManager.map.scale >= _maxScale) &&
					(ViewerContainer.getInstance().mapManager.map.scale <= _minScale)){
					this.scaledependant = false;
				}			
			} else if (_maxScale > 0 ){
				if ((ViewerContainer.getInstance().mapManager.map.scale >= _maxScale)){
					this.scaledependant = false;
				}
			} else if (_minScale > 0 ) {
				if ((ViewerContainer.getInstance().mapManager.map.scale <= _minScale)){
					this.scaledependant = false;
				}
			} else {
				this.scaledependant = false;
			}
		}
		
		public function get maxScale():Number
		{
			return _maxScale;
		}
		
		private function checkExtent(evt:ExtentEvent):void{
			this.scaledependant = true;
			
			if(_maxScale > 0 && _minScale > 0){
				if ((ViewerContainer.getInstance().mapManager.map.scale >= _maxScale) &&
					(ViewerContainer.getInstance().mapManager.map.scale <= _minScale)){
					this.scaledependant = false;
				}			
			} else if (_maxScale > 0 ){
				if ((ViewerContainer.getInstance().mapManager.map.scale >= _maxScale)){
					this.scaledependant = false;
				}
			} else if (_minScale > 0 ) {
				if ((ViewerContainer.getInstance().mapManager.map.scale <= _minScale)){
					this.scaledependant = false;
				}
			} else {
				this.scaledependant = false;
			}
		}
		
		private function getTocMapItem(tocItem:TocItem):TocMapLayerItem
		{
			const tocMapItem:TocMapLayerItem = tocItem as TocMapLayerItem;
			if (tocMapItem)
				return tocMapItem;
			if (tocItem.parent)
				return getTocMapItem(tocItem.parent);
			return null;
		}
		
		internal static const DEFAULT_MIN:Number = 0;
		
		private var _minScale:Number = DEFAULT_MIN;
		
		public function set minScale( value:Number ):void
		{
			_minScale = value;
			this.scaledependant = true;
			
			if(_maxScale > 0 && _minScale > 0){
				if ((ViewerContainer.getInstance().mapManager.map.scale >= _maxScale) &&
					(ViewerContainer.getInstance().mapManager.map.scale <= _minScale)){
					this.scaledependant = false;
				}			
			} else if (_maxScale > 0 ){
				if ((ViewerContainer.getInstance().mapManager.map.scale >= _maxScale)){
					this.scaledependant = false;
				}
			} else if (_minScale > 0 ) {
				if ((ViewerContainer.getInstance().mapManager.map.scale <= _minScale)){
					this.scaledependant = false;
				}
			} else {
				this.scaledependant = false;
			}
		}
		
		public function get minScale():Number
		{
			return _minScale;
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
	
	    //--------------------------------------------------------------------------
	    //  Property:  layerInfo
	    //--------------------------------------------------------------------------
	
	    private var _layerInfo:LayerInfo;
	
	    /**
	     * The map layer info that backs this TOC item.
	     */
	    public function get layerInfo():LayerInfo
	    {
	        return _layerInfo;
	    }
	
	    //--------------------------------------------------------------------------
	    //
	    //  Methods
	    //
	    //--------------------------------------------------------------------------
	
	    /**
	     * @private
	     */
	    override internal function setVisible(value:Boolean, layerRefresh:Boolean = true):void
	    {
	        // Set the visible state of this item, but defer the layer refresh
	        super.setVisible(value, false);
			
			checkExtent(null);
	
	        // Allow the layer refresh now that all changes have been made
	        if (layerRefresh)
	            refreshLayer();
	    }
		
		public function getImageResult():*
		{
			const tocMapItem:TocMapLayerItem = getTocMapItem(parent);
			const legendInfo:LegendDataItem = tocMapItem.getLegendDataByLayerID(_layerInfo.layerId);
			if (legendInfo){
				if (legendInfo.legendGroup.length == 1){
					const legendClass:LegendDataClassItem = legendInfo.legendGroup[0];
					if(legendClass.image){
						return legendClass.image;
					}else if (legendClass.symbolitems.length == 1){
						var lsi:LegendSymbolItem = legendClass.symbolitems[0];
						return lsi.uic;
					}
				}
			}
			return null;
		}
		
		public function addLegendClasses(vbox:VBox):void
		{
			const tocMapItem:TocMapLayerItem = getTocMapItem(parent);
			const legendInfo:LegendDataItem = tocMapItem.getLegendDataByLayerID(_layerInfo.layerId);
			if (legendInfo){
				if (legendInfo.legendGroup.length > 0){
					for (var lc:int = 0; lc < legendInfo.legendGroup.length; lc++){
						const legendClass:LegendDataClassItem = legendInfo.legendGroup[lc];
						if (legendClass.symbolitems.length > 1 || tocMapItem.layer is KMLLayer){
							for each (var lsi:LegendSymbolItem in legendClass.symbolitems){
								const hbox2:HBox = new HBox();
								hbox2.setStyle("horizontalGap", 2);
								hbox2.setStyle("verticalAlign", "middle");
								
								const lbl2:Label = new Label();
								lbl2.setStyle("fontWeight", "normal");
								
								lbl2.text = lsi.label;
								if(lsi.image){
									hbox2.addChild(lsi.image);
								}else{
									hbox2.addChild(lsi.uic);
								}
								hbox2.addChild(lbl2);
								vbox.addChild(hbox2);
							}
						}else if (legendInfo.legendGroup.length > 1){
							const hbox:HBox = new HBox();
							hbox.setStyle("horizontalGap", 2);
							hbox.setStyle("verticalAlign", "middle");
							
							const lbl:Label = new Label();
							lbl.setStyle("fontWeight", "normal");
							
							lbl.text = legendClass.label;
							hbox.addChild(legendClass.image);
							
							hbox.addChild(lbl);
							vbox.addChild(hbox);
						}
					}
				}
			}
		}
	}
}
