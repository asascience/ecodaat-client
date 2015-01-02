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
package widgets.eSearch
{
	import flash.events.EventDispatcher;
	
	import widgets.eSearch.SearchResult;
	
	[Bindable]
	[RemoteClass(alias="widgets.eSearch.RelateResult")]
	
	public class RelateResult extends EventDispatcher
	{
		public var name:String;
		
		public var id:Number;
		
		public var fields:XMLList;
		
		public var enableexport:Boolean;
		
		public var oid:Number;
		
		public var icon:String;
	}
}