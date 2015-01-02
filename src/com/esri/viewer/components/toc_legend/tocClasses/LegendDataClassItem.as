// ActionScript file
package com.esri.viewer.components.toc_legend.tocClasses
{	
	import flash.events.EventDispatcher;
	import mx.controls.Image;

	[Bindable]
	[RemoteClass(alias="com.esri.viewer.components.toc_legend.tocClasses.LegendDataClassItem")]
	
	public class LegendDataClassItem extends EventDispatcher
	{
		public var symbolitems:Array = [];
		public var image:Image;
		public var label:String;
	}
}