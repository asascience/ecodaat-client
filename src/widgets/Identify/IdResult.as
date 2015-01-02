////////////////////////////////////////////////////////////////////////////////
//
// Version 2.1.3 - Sept. 25, 2010
//
// Delevoped by Robert Scheitlin
//
////////////////////////////////////////////////////////////////////////////////
package widgets.Identify
{
	import com.esri.ags.Graphic;
	import com.esri.ags.geometry.Geometry;
	import com.esri.ags.geometry.MapPoint;
	
	import flash.events.EventDispatcher;
	
	[Bindable]
	[RemoteClass(alias="widgets.Identify.IdentifyResult")]
	
	public class IdResult extends EventDispatcher
	{
		public var title:String;
		
		public var icon:String;
		
		public var content:String;
		
		public var point:MapPoint;
		
		public var links:Array = [];
		
		public var zoom2msg:String;
		
		public var zoomScale:Number;
		
		public var geometry:Geometry;
		
		public var forceScale:Boolean;
		
		public var graphic:Graphic;
	}
}