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

	import com.esri.viewer.AppEvent;
	import com.esri.viewer.ViewerContainer;
	
	import flash.events.EventDispatcher;
	
	import mx.collections.ArrayCollection;
	import mx.events.PropertyChangeEvent;
	import mx.utils.ObjectUtil;
	
	import spark.components.Scroller;
	
	/**
	 * The base TOC item.
	 */
	public class TocItem extends EventDispatcher
	{
		
	    public function TocItem(parentItem:TocItem = null)
	    {
	        _parent = parentItem;
	    }
	
	    //--------------------------------------------------------------------------
	    //  Property:  parent
	    //--------------------------------------------------------------------------
	
	    private var _parent:TocItem;
	
	    /**
	     * The parent TOC item of this item.
	     */
	    public function get parent():TocItem
	    {
	        return _parent;
	    }
		
		//--------------------------------------------------------------------------
		//  Propety:  tooltip
		//--------------------------------------------------------------------------
		
		internal static const DEFAULT_TOOLTIP:String = "";
		
		private var _tToolTip:String = DEFAULT_TOOLTIP;
		
		public function set ttooltip(value:String):void
		{
			_tToolTip = value;
		}
		
		public function get ttooltip():String
		{
			return _tToolTip;
		}
		
		//--------------------------------------------------------------------------
		//  Propety:   minimum renderer width
		//--------------------------------------------------------------------------
		
		internal static const TOC_MIN_WIDTH:Number = 200;
		
		private var _tocMinWidth:Number = TOC_MIN_WIDTH;
		
		public function set tocMinWidth(value:Number):void
		{
			_tocMinWidth = value;
		}
		
		public function get tocMinWidth():Number
		{
			return _tocMinWidth;
		}
		
		//--------------------------------------------------------------------------
		//  Propety:   scroller
		//--------------------------------------------------------------------------
		
		internal static const TOC_SCROLLER:* = null;
		
		private var _scroller:Scroller = TOC_SCROLLER;
		
		public function set scroller(value:Scroller):void
		{
			_scroller = value;
		}
		
		public function get scroller():Scroller
		{
			return _scroller;
		}
	
	    //--------------------------------------------------------------------------
	    //  Property:  children
	    //--------------------------------------------------------------------------
	
	    [Bindable]
	    /**
	     * The child items of this TOC item.
	     */
	    public var children:ArrayCollection; // of TocItem
	
	    /**
	     * Adds a child TOC item to this item.
	     */
	    internal function addChild(item:TocItem):void
	    {
	        if (!children)
	        {
	            children = new ArrayCollection();
	        }
	        children.addItem(item);
	    }
	
	    //--------------------------------------------------------------------------
	    //  Property:  label
	    //--------------------------------------------------------------------------
	
	    internal static const DEFAULT_LABEL:String = "(?)";
	
	    private var _label:String = DEFAULT_LABEL;
	
	    [Bindable("propertyChange")]
	    /**
	     * The text label for the item renderer.
	     */
	    public function get label():String
	    {
	        return _label;
	    }
	
	    /**
	     * @private
	     */
	    public function set label(value:String):void
	    {
	        var oldValue:Object = _label;
	        _label = (value ? value : DEFAULT_LABEL);
	
	        // Dispatch a property change event to notify the item renderer
	        dispatchEvent(PropertyChangeEvent.createUpdateEvent(this, "label", oldValue, _label));
	    }
	
	    //--------------------------------------------------------------------------
	    //  Property:  visible
	    //--------------------------------------------------------------------------
	
	    internal static const DEFAULT_VISIBLE:Boolean = true;
	
	    private var _visible:Boolean = DEFAULT_VISIBLE;
	
	    [Bindable("propertyChange")]
	    /**
	     * Whether the map layer referred to by this TOC item is visible or not.
	     */
	    public function get visible():Boolean
	    {
	        return _visible;
	    }
	
	    /**
	     * @private
	     */
	    public function set visible(value:Boolean):void
	    {
	        setVisible(value, true);
	    }
	
	    /**
	     * Allows subclasses to change the visible state without causing a layer refresh.
	     */
	    internal function setVisible(value:Boolean, layerRefresh:Boolean = true):void
	    {
	        if (value != _visible)
	        {
	            var oldValue:Object = _visible;
	            _visible = value;
	
	            if (layerRefresh)
	            {
	                refreshLayer();
	            }
	
	            // Dispatch a property change event to notify the item renderer
	            dispatchEvent(PropertyChangeEvent.createUpdateEvent(this, "visible", oldValue, value));
	        }
	    }
	
	    private function setVisibleDirect(value:Boolean):void
	    {
	        if (value != _visible)
	        {
	            var oldValue:Object = _visible;
	            _visible = value;
	
	            // Dispatch a property change event to notify the item renderer
	            dispatchEvent(PropertyChangeEvent.createUpdateEvent(this, "visible", oldValue, value));
	        }
	    }
		
		//--------------------------------------------------------------------------
		//  Property:  Collapsed
		//--------------------------------------------------------------------------
		
		internal static const DEFAULT_STATE:Boolean = false;
		
		private var _collapsed:Boolean = DEFAULT_STATE;
		
		[Bindable("propertyChange")]
		/**
		 * Whether the visibility of this TOC item is in a mixed state,
		 * based on child item visibility or other criteria.
		 */
		public function get collapsed():Boolean
		{
			return _collapsed;
		}
		/**
		 * @private
		 */
		public function set collapsed( value:Boolean ):void
		{
			if (value != _collapsed) {
				var oldValue:Object = _collapsed;
				_collapsed = value;
				
				// Dispatch a property change event to notify the item renderer
				dispatchEvent(PropertyChangeEvent.createUpdateEvent(this, "collapsed", oldValue, value));
			}
		}
	
		//--------------------------------------------------------------------------
		//  Property:  scaledependant
		//--------------------------------------------------------------------------
		
		internal static const DEFAULT_SCALEDEPENDANT:Boolean = false;
		
		private var _scaledependant:Boolean = DEFAULT_SCALEDEPENDANT;
		
		[Bindable("propertyChange")]
		/**
		 * Whether the visibility of this TOC item is in a mixed state,
		 * based on child item visibility or other criteria.
		 */
		public function get scaledependant():Boolean
		{
			return _scaledependant;
		}
		/**
		 * @private
		 */
		public function set scaledependant( value:Boolean ):void
		{
			if (value != _scaledependant) {
				var oldValue:Object = _scaledependant;
				_scaledependant = value;
				
				// Dispatch a property change event to notify the item renderer
				dispatchEvent(PropertyChangeEvent.createUpdateEvent(this, "scaledependant", oldValue, value));
			}
		}
		
		//--------------------------------------------------------------------------
		//  Propety:  disableZoomTo
		//--------------------------------------------------------------------------
		
		internal static const DEFAULT_ZOOMTO:Boolean = false;
		
		private var _disableZoomTo:Boolean = DEFAULT_ZOOMTO;
		
		public function set disableZoomTo(value:Boolean):void
		{
			_disableZoomTo = value;
		}
		
		public function get disableZoomTo():Boolean
		{
			return _disableZoomTo;
		}
	
	    /**
	     * Whether this TOC item is at the root level.
	     */
	    public function isTopLevel():Boolean
	    {
	        return _parent == null;
	    }
	
	    /**
	     * Whether this TOC item contains any child items.
	     */
	    public function isGroupLayer():Boolean
	    {
	        return children && children.length > 0;
	    }
	
	    /**
	     * Invalidates any map layer that is associated with this TOC item.
	     */
	    internal function refreshLayer():void
	    {
	        // Recurse up the tree
	        if (parent)
	        {
	            parent.refreshLayer();
	        }
	    }
	
	    override public function toString():String
	    {
	        return ObjectUtil.toString(this);
	    }
	}
}