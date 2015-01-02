// ActionScript file
package com.esri.viewer.components.toc_legend.tocClasses
{
	import com.esri.ags.renderers.Renderer;
	
	import flash.events.EventDispatcher;

	[Bindable]
	[RemoteClass(alias="com.esri.viewer.components.toc_legend.tocClasses.LegendDataItem")]
	
	public class LegendDataItem extends EventDispatcher
	{
		public var lname:String;
		public var id:int;
		public var minscale:Number;
		public var maxscale:Number;
		public var token:String;
		public var label:String;
		public var legendGroup:Array =[];
	}
}