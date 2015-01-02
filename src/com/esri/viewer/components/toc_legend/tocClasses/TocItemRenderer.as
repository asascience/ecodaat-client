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

	import com.esri.ags.layers.FeatureLayer;
	import com.esri.ags.layers.KMLLayer;
	import com.esri.ags.layers.Layer;
	import com.esri.ags.layers.TiledMapServiceLayer;
	import com.esri.viewer.AppEvent;
	import com.esri.viewer.ViewerContainer;
	
	import flash.events.Event;
	import flash.events.MouseEvent;
	import flash.geom.Point;
	
	import mx.containers.VBox;
	import mx.controls.Alert;
	import mx.controls.Image;
	import mx.controls.treeClasses.TreeItemRenderer;
	import mx.controls.treeClasses.TreeListData;
	import mx.core.FlexGlobals;
	import mx.core.UIComponent;
	import mx.core.mx_internal;
	import mx.events.FlexEvent;
	import mx.managers.PopUpManager;
	import mx.managers.PopUpManagerChildList;
	
	import spark.components.Group;
	import spark.components.HSlider;
	import spark.components.VGroup;
	import spark.layouts.VerticalLayout;
	import spark.primitives.BitmapImage;
	
	import com.esri.viewer.components.toc_legend.DetailsWindow;
	import com.esri.viewer.components.toc_legend.TOC;
	import com.esri.viewer.components.toc_legend.controls.CheckBoxScaleDependant;
	
	/**
	 * A custom tree item renderer for a map Table of Contents.
	 */
	public class TocItemRenderer extends TreeItemRenderer
	{
	    // Renderer UI components
		private var _checkbox:CheckBoxScaleDependant;
		
		private var _vbox:VBox;
		
		private var _btn:Image;
		
		private var _btn2:Image;
		
		private var _group:Group;
	
	    // UI component spacing
	    private static const PRE_CHECKBOX_GAP:Number = 0;
	
	    private static const POST_CHECKBOX_GAP:Number = 0;
		
		[Embed(source="../../images/plus.png")]
		[Bindable]
		private var _Expand:Class;
		
		[Embed(source="../../images/minus.png")]
		[Bindable]
		private var _Collapse:Class;
		
		private var _tocLayerMenu:TocLayerMenu
		
		[Embed(source="../../images/Context_menu11.png")]
		[Bindable]
		public var contextCls:Class;
		
		private var _layerMenuImage:Image;
		
		private var _toc:TOC;
		
		public function TocItemRenderer()
		{
			super();
			
			addEventListener(MouseEvent.CLICK, itemClickHandler);
		}

		override public function set data(value:Object):void
		{
			super.data = value;
			
			if (!_btn2)
			{
				_btn2 = new Image();
				_btn2.id = "btnCollapseExp"
				_btn2.width = 0;
				_btn2.height = 16;
				_btn2.buttonMode = true;
				_btn2.useHandCursor = false;
				_btn2.source = _Collapse;
				_btn2.y = 5;
				_btn2.visible = _btn2.includeInLayout = true;
				addChild(_btn2);
				_btn2.addEventListener(MouseEvent.CLICK, toggleLegVis);
			}
			
			if (!_checkbox)
			{
				_checkbox = new CheckBoxScaleDependant();
				_checkbox.addEventListener(MouseEvent.CLICK, onCheckBoxClick);
				_checkbox.addEventListener(MouseEvent.DOUBLE_CLICK, onCheckBoxDoubleClick);
				_checkbox.addEventListener(MouseEvent.MOUSE_DOWN, onCheckBoxMouseDown);
				_checkbox.addEventListener(MouseEvent.MOUSE_UP, onCheckBoxMouseUp);
				addChild(_checkbox);
			}
			
			if (!_layerMenuImage)
			{
				_layerMenuImage = new Image();
				_layerMenuImage.source = contextCls;
				_layerMenuImage.height = 11;
				_layerMenuImage.width = 11;
				_layerMenuImage.setStyle("verticalAlign", "middle");
				_layerMenuImage.buttonMode = true;
				addChild(_layerMenuImage);
				_layerMenuImage.addEventListener(MouseEvent.CLICK, onLayerMenuImageClick);
				_layerMenuImage.addEventListener(MouseEvent.DOUBLE_CLICK, onLayerMenuImageDoubleClick);
			}
			
			if (!_group)
			{
				_group = new Group();
				_group.mouseEnabled = _group.mouseChildren = false;
				_group.y = 4;
				addChild(_group);
			}
			
			if (!_vbox)
			{
				_vbox = new VBox();
				_vbox.setStyle("verticalGap", -1)
				_vbox.mouseEnabled = _vbox.mouseChildren = false;
				addChild(_vbox);
			}
			
			const tocItem:TocItem = TocItem(data);
			if (tocItem && tocItem.label != "dummy")
			{

				if(!tocItem.collapsed){
					_vbox.mouseEnabled = _vbox.mouseChildren = true;
					_group.mouseEnabled = _group.mouseChildren = true;
				}
				_checkbox.scaledependant = tocItem.scaledependant;
				_checkbox.selected = tocItem.visible;
				
				// Hide the checkbox for child items of tiled map services
				_checkbox.visible = isTiledLayerChild(tocItem) ? false : true;
				
				// Hide the checkbox for child items of kml layer map services
				if(!isTiledLayerChild(tocItem))
					_checkbox.visible = isKMLLayerChild(tocItem) ? false : true;
				
				// Hide the checkbox for child items of feature layer map services
				if(!isTiledLayerChild(tocItem) && !isKMLLayerChild(tocItem))
					_checkbox.visible = isFeatureLayerChild(tocItem) ? false : true;
				
				// Apply a bold label style to root nodes
				setStyle("fontWeight", tocItem.isTopLevel() ? "bold" : "normal");
				
				//If ScaleDependant than make text gray
				label.enabled = !tocItem.scaledependant;

				if(tocItem.collapsed){
					_vbox.includeInLayout = _vbox.visible = _group.includeInLayout = _group.visible = false;
				}else{
					_vbox.includeInLayout = _vbox.visible = _group.includeInLayout = _group.visible = true;
				}
			}
			_vbox.removeAllChildren();
			_group.removeAllElements();
			if(data is TocLayerInfoItem){
				const tocLayerItem:TocLayerInfoItem = data as TocLayerInfoItem;
				if (tocLayerItem && tocItem.label != "dummy")
				{
					const imageResult:* = tocLayerItem.getImageResult();
					if (imageResult)
					{
						_group.height = imageResult.height;
						_group.width = imageResult.width;
						_group.addElement(imageResult);
					}
					
					tocLayerItem.addLegendClasses(_vbox);
					if(_vbox && _vbox.numChildren > 0 && disclosureIcon && !disclosureIcon.visible)
						_btn2.visible = _btn2.includeInLayout = true;
					if(_group && _group.numElements > 0 && disclosureIcon && !disclosureIcon.visible)
						_btn2.visible = _btn2.includeInLayout = true;
					if(tocLayerItem.collapsed && _btn2.visible)
						_btn2.source = _Collapse;
					_vbox.invalidateSize();
					_vbox.invalidateDisplayList();
				}
			}else if(data is TocKmlFolderItem){
				const tocKMLItem:TocKmlFolderItem = data as TocKmlFolderItem;
				if (tocKMLItem && tocItem.label != "dummy")
				{
					const imageResult2:* = tocKMLItem.getImageResult();
					if (imageResult)
					{
						_group.height = imageResult2.height;
						_group.width = imageResult2.width;
						_group.addElement(imageResult2);
					}
					
					tocKMLItem.addLegendClasses(_vbox);
					if(_vbox && _vbox.numChildren > 0 && disclosureIcon && !disclosureIcon.visible)
						_btn2.visible = _btn2.includeInLayout = true;
					if(_group && _group.numElements > 0 && disclosureIcon && !disclosureIcon.visible)
						_btn2.visible = _btn2.includeInLayout = true;
					if(tocKMLItem.collapsed && _btn2.visible)
						//_btn2.source = _Collapse;
					_vbox.invalidateSize();
					_vbox.invalidateDisplayList();
				}
			}else if(data is TocKmlNetworkLinkItem){
				const tocKMLnetlinkItem:TocKmlNetworkLinkItem = data as TocKmlNetworkLinkItem;
				if (tocKMLnetlinkItem && tocItem.label != "dummy")
				{
					const imageResult3:* = tocKMLnetlinkItem.getImageResult();
					if (imageResult)
					{
						_group.height = imageResult3.height;
						_group.width = imageResult3.width;
						_group.addElement(imageResult3);
					}
					
					tocKMLnetlinkItem.addLegendClasses(_vbox);
					if(_vbox && _vbox.numChildren > 0 && disclosureIcon && !disclosureIcon.visible)
						_btn2.visible = _btn2.includeInLayout = true;
					if(_group && _group.numElements > 0 && disclosureIcon && !disclosureIcon.visible)
						_btn2.visible = _btn2.includeInLayout = true;
					if(tocKMLnetlinkItem.collapsed && _btn2.visible)
						//_btn2.source = _Collapse;
					_vbox.invalidateSize();
					_vbox.invalidateDisplayList();
				}
			}
			
			invalidateDisplayList();
		}
		
		private function onLayerMenuImageClick(event:MouseEvent):void
		{
			event.stopPropagation();
			
			// need to show/hide pop-up with information.
			AppEvent.removeListener(AppEvent.TOC_HIDDEN, onRemovalFromStage);
			
			if (_tocLayerMenu && _tocLayerMenu.isPopUp){
				_tocLayerMenu.remove();
				_tocLayerMenu = null;
			}else{
				// let any other popups know a popup is about to be created and opened
				AppEvent.dispatch(AppEvent.LAUNCHING_TOC_LAYER_MENU);
				_tocLayerMenu = new TocLayerMenu();
				var originPoint:Point = new Point(x + width, label.y);
				if (FlexGlobals.topLevelApplication.layoutDirection != "rtl") // fix for RTL
					originPoint.x -= _tocLayerMenu.width;
				var globalPoint:Point = localToGlobal(originPoint);
				_tocLayerMenu.popUpForItem(parent.parent, data, ViewerContainer.getInstance().mapManager.map, globalPoint.x, globalPoint.y + (_layerMenuImage.height + 4));//height);
				
				AppEvent.addListener(AppEvent.TOC_HIDDEN, onRemovalFromStage);
			}
		}
		
		private function onRemovalFromStage(event:AppEvent):void
		{
			AppEvent.removeListener(AppEvent.TOC_HIDDEN, onRemovalFromStage);
			if (_tocLayerMenu)
			{
				_tocLayerMenu.remove();
				_tocLayerMenu = null;
			}
		}
		
		private function onLayerMenuImageDoubleClick(event:MouseEvent):void
		{
			event.stopPropagation();       
		}
		
		public function toggleLegVis(evt:Event):void
		{			
			const tocItem:TocItem = TocItem(data);
			if (_vbox && _vbox.numChildren > 0)
			{
				if(_vbox.visible){
					_btn2.source = _Expand;
					_vbox.visible = false;
					_vbox.includeInLayout = false;
					invalidateDisplayList();
					tocItem.collapsed = true;
				}else{
					_btn2.source = _Collapse;
					_vbox.visible = true;
					_vbox.includeInLayout = false;
					invalidateDisplayList();
					tocItem.collapsed = false;
				}
			}
			if (_group && _group.numElements > 0)
			{
				if(_group.visible){
					_btn2.source = _Expand;
					_group.visible = _group.includeInLayout = false;
					invalidateDisplayList();
					tocItem.collapsed = true;
				}else{
					_btn2.source = _Collapse;
					_group.visible = _group.includeInLayout = false;
					invalidateDisplayList();
					tocItem.collapsed = false;
				}
			}
		}
	
	    /**
	     * @private
	     */
	    override protected function measure():void
	    {
	        super.measure();
			const tocItem:TocItem = TocItem(data);
	
	        // Add space for the checkbox and gaps
	        if (isNaN(explicitWidth) && !isNaN(measuredWidth))
	        {
	            var w:Number = measuredWidth;
				if (_vbox && _vbox.numChildren > 0 && _vbox.measuredWidth > w) w = _vbox.measuredWidth;
				if(tocItem){
					if(w < tocItem.tocMinWidth){
						if(tocItem.scroller && tocItem.scroller.verticalScrollBar.visible){
							w = tocItem.tocMinWidth - 20;
						}else{
							w = tocItem.tocMinWidth;
						}
					}else{
						w += _layerMenuImage.measuredWidth;
					}
				}
				measuredWidth = w;
	        }
			if (!isNaN(measuredHeight))
			{
				var h:Number = measuredHeight + 5;
				if(_vbox && _vbox.numChildren > 0 && _vbox.visible)
					h += _vbox.getExplicitOrMeasuredHeight();
				measuredHeight = h;
			}
	    }
	
	    /**
	     * @private
	     */
	    override protected function updateDisplayList(unscaledWidth:Number, unscaledHeight:Number):void
	    {
	        super.updateDisplayList(unscaledWidth, unscaledHeight);
			const tocItem:TocItem = TocItem(data);
			
			if(label.text == "dummy"){
				_btn2.visible = _btn2.includeInLayout = false;
				label.visible = false;
				_checkbox.visible = false;
				_layerMenuImage.visible = false;
				return;
			}else{
				label.visible = true;
			}
			if(tocItem){
				// Hide the checkbox for child items of tiled map services
				_checkbox.visible = isTiledLayerChild(tocItem) ? false : true;
				
				// Hide the checkbox for child items of kml layer map services
				if(!isTiledLayerChild(tocItem))
					_checkbox.visible = isKMLLayerChild(tocItem) ? false : true;
				
				// Hide the checkbox for child items of feature layer map services
				if(!isTiledLayerChild(tocItem) && !isKMLLayerChild(tocItem))
					_checkbox.visible = isFeatureLayerChild(tocItem) ? false : true;
				if(tocItem.parent)
					_checkbox.visible = true;
				else{
					_checkbox.visible = true;
					_layerMenuImage.visible = true;
				}
			}
			
			_btn2.visible = _btn2.includeInLayout = false;
			
			if(_vbox && _vbox.numChildren > 0 && disclosureIcon && !disclosureIcon.visible)
				_btn2.visible = _btn2.includeInLayout = true;
			
			if(_group && _group.numElements > 0 && disclosureIcon && !disclosureIcon.visible)
				_btn2.visible = _btn2.includeInLayout = true;
			
			//If ScaleDependant than make text gray
			if(tocItem){
				label.enabled = !tocItem.scaledependant;
			}
				
	        var startx:Number = data ? TreeListData(listData).indent : 0;
	        if (icon){
	            startx = icon.x;
	        }else if (disclosureIcon && disclosureIcon.visible){
	            startx = disclosureIcon.x + disclosureIcon.width + 2;
	        }
			
			if (_btn2 && _btn2.visible){
				_btn2.x = startx;
				startx = _btn2.x + _btn2.width;
			}
			startx += PRE_CHECKBOX_GAP;
	
	        // Position the checkbox between the disclosure icon and the item icon
	        _checkbox.x = startx;
	        _checkbox.setActualSize(_checkbox.measuredWidth, _checkbox.measuredHeight);
	        _checkbox.y = 7;
			_btn2.y = 5;
			if(_checkbox.visible)
	        	startx = _checkbox.x + _checkbox.width + POST_CHECKBOX_GAP;
			
			if (_group && _group.numElements > 0 && _group.visible)
			{
				_group.setActualSize(_group.contentWidth, _group.contentHeight);
				_group.x = startx;
				_group.y = (_group.height > 0)?(unscaledHeight - _group.height) / 2 : 4;
				startx = _group.x + 30 + POST_CHECKBOX_GAP;
			}
			
	        if (icon)
	        {
	            icon.x = startx;
	            startx = icon.x + icon.width;
	        }
	
	        label.x = 46;
			label.y = 4;
			label.setActualSize(label.measuredWidth, label.measuredHeight);
			
			if(tocItem){
				if(tocItem.collapsed){
					//_btn2.source = _Expand;
					//_vbox.includeInLayout = _vbox.visible = _group.includeInLayout = _group.visible = false;
				}else{
					//_btn2.source = _Collapse;
					//_vbox.includeInLayout = _vbox.visible = _group.includeInLayout = _group.visible = true;
				}
			}
			
			if (_vbox && _checkbox && _vbox.visible)
			{
				_vbox.setActualSize(_vbox.measuredWidth, _vbox.measuredHeight);
				_vbox.x = label.x + 2;
				_vbox.y = 25;
			}
			
			// hide the option button if this is not a layer
			if (!isLayerItem(tocItem)){
				_layerMenuImage.visible = false;
			}else{
				_layerMenuImage.visible = true;
			}
			
			// hide the option button if this is not a layer or if the sublayer does not have an extent
			//if((isLayerItem(tocItem) || hasLayerExtent(tocItem)) && isMenuEmpty(tocItem) == false){
			if(tocItem == null)
			{
				_layerMenuImage.visible = false;
			}
			else
			{
				if(tocItem.parent)
				{
					_layerMenuImage.visible = false;
				}
				else{
					_layerMenuImage.visible = true;
				}
			}
				
			if(tocItem){
				if(tocItem.ttooltip && tocItem.ttooltip != "" && !TOC(parent.parent).UseESRIDesc)
					_layerMenuImage.visible = true;
				if(tocItem.scaledependant)
					_layerMenuImage.visible = false;
			}
			
			var layerMenuImageSpace:Number = POST_CHECKBOX_GAP + _layerMenuImage.width + PRE_CHECKBOX_GAP;
			
			label.setActualSize(unscaledWidth - startx - layerMenuImageSpace, measuredHeight);
			
			_layerMenuImage.x = startx + label.width + PRE_CHECKBOX_GAP;
			_layerMenuImage.y = 12 - (_layerMenuImage.height / 2);//(unscaledHeight - _layerMenuImage.height) / 2;
	    }
		
		private function isMenuEmpty(item:Object):Boolean
		{
			var retVal:Boolean = true;
			var _layer:Layer;
			
			if (item is TocLayerInfoItem){
				if (item.layerExtent){
					if(!item.disableZoomTo){
						retVal = false;
					}
				}
				
				if(item.scaledependant){
					retVal = false;
				}
				if (parent.parent is TOC){
					_toc = TOC(parent.parent);
					if (_toc.UseESRIDesc){
						if(item is TocMapLayerItem)
							_layer = TocMapLayerItem(item).layer;
						if(_layer){
							if(!(_layer is FeatureLayer && FeatureLayer(_layer).featureCollection)){
								retVal = false;
							}
						}
					}else if (item.ttooltip && item.ttooltip != ""){
						retVal = false;
					}
				}
			}else{
				retVal = false;
			}
			return retVal;
		}
	
	    /**
	     * Whether the specified TOC item is a child of a tiled map service layer.
	     */
	    private function isTiledLayerChild(item:TocItem):Boolean
	    {
	        while (item){
	            item = item.parent;
	            if (item is TocMapLayerItem){
	                if (TocMapLayerItem(item).layer is TiledMapServiceLayer){
	                    return true;
	                }
	            }
	        }
	        return false;
	    }
		
		/**
		 * Whether the specified TOC item is a child of a Feature Layer map service layer.
		 */
		private function isFeatureLayerChild(item:TocItem):Boolean
		{
			while (item){
				item = item.parent;
				if (item is TocMapLayerItem){
					if (TocMapLayerItem(item).layer is FeatureLayer){
						return true;
					}
				}
			}
			return false;
		}
		
		/**
		 * Whether the specified TOC item is a child of a kml Layer map service layer.
		 */
		private function isKMLLayerChild(item:TocItem):Boolean
		{
			while (item){
				item = item.parent;
				if (item is TocMapLayerItem){
					if (TocMapLayerItem(item).layer is KMLLayer){
						return true;
					}
				}
			}
			return false;
		}
		
		/**
		 * Whether the specified TOC item is a child of a map service layer.
		 */
		private function isLayerItem(item:TocItem):Boolean
		{
			if (item){
				if (item is TocMapLayerItem){
					if (TocMapLayerItem(item).layer is Layer){
						return true;
					}
				}
			}
			return false;
		}
		
		/**
		 * Whether the specified TOC item has a Layer Extent.
		 */
		private function hasLayerExtent(item:TocItem):Boolean
		{
			if (item){
				if (item is TocLayerInfoItem){
					if (TocLayerInfoItem(item).layerExtent.spatialReference){
						return true;
					}
				}
			}
			return false;
		}
		
		private function itemClickHandler(event:MouseEvent):void
		{
			AppEvent.dispatch(AppEvent.TOC_HIDDEN); // always hide the layer options popup
		}
	
	    /**
	     * Updates the visible property of the underlying TOC item.
	     */
	    private function onCheckBoxClick(event:MouseEvent):void
	    {
	        event.stopPropagation();
	
	        if (data is TocItem)
	        {
	            var item:TocItem = TocItem(data);
	            item.visible = _checkbox.selected;
	        }
	    }
	
	    private function onCheckBoxDoubleClick(event:MouseEvent):void
	    {
	        event.stopPropagation();
	    }
	
	    private function onCheckBoxMouseDown(event:MouseEvent):void
	    {
	        event.stopPropagation();
	    }
	
	    private function onCheckBoxMouseUp(event:MouseEvent):void
	    {
	        event.stopPropagation();
			AppEvent.dispatch(AppEvent.TOC_HIDDEN); // always hide the layer options popup
	    }
	}
}