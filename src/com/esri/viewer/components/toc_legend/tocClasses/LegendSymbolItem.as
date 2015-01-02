// ActionScript file
package com.esri.viewer.components.toc_legend.tocClasses
{	
	import flash.events.EventDispatcher;
	import mx.controls.Image;
	import mx.core.UIComponent;

	[Bindable]
	[RemoteClass(alias="com.esri.viewer.components.toc_legend.tocClasses.LegendSymbolItem")]
	
	public class LegendSymbolItem extends EventDispatcher
	{
		public var label:String;
		public var image:Image;
		public var uic:UIComponent
	}
}