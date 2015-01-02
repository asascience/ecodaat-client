package widgets.eSearch
{

	import flash.display.DisplayObject;
	import flash.events.Event;
	import flash.events.MouseEvent;
	import flash.ui.Mouse;
	import flash.ui.MouseCursor;
	
	import mx.controls.listClasses.BaseListData;
	import mx.controls.listClasses.IDropInListItemRenderer;
	import mx.controls.listClasses.IListItemRenderer;
	import mx.core.UIComponent;
	import mx.events.FlexEvent;
	
	import spark.components.Group;
	
	/**
	 *  assumes the image is embedded and not a .swf
	 */
	public class CenteredEmbededImage extends UIComponent implements IListItemRenderer, IDropInListItemRenderer
	{
		
		public function CenteredEmbededImage()
		{
			super();
		}
		
		//----------------------------------
		//  data
		//----------------------------------
		
		/**
		 *  @private
		 *  Storage for the data property.
		 */
		private var _data:Object;
		
		[Bindable("dataChange")]
		[Inspectable(environment="none")]
		
		/**
		 *  Lets you pass a value to the component
		 *  when you use it in an item renderer or item editor.
		 *  You typically use data binding to bind a field of the <code>data</code>
		 *  property to a property of this component.
		 *
		 *  <p>When you use the control as a drop-in item renderer or drop-in
		 *  item editor, Flex automatically writes the current value of the item
		 *  to the <code>text</code> property of this control.</p>
		 *
		 *  <p>You do not set this property in MXML.</p>
		 *
		 *  @default null
		 *  @see mx.core.IDataRenderer
		 */
		public function get data():Object
		{
			return _data;
		}
		
		/**
		 *  @private
		 */
		public function set data(value:Object):void
		{
			var newText:*;
			
			_data = value;
			
			invalidateProperties();
			
			dispatchEvent(new FlexEvent(FlexEvent.DATA_CHANGE));
		}
		
		//----------------------------------
		//  listData
		//----------------------------------
		
		/**
		 *  @private
		 *  Storage for the listData property.
		 */
		private var _listData:BaseListData;
		
		private var cCur:int;
		
		[Bindable("dataChange")]
		[Inspectable(environment="none")]
		
		/**
		 *  When a component is used as a drop-in item renderer or drop-in
		 *  item editor, Flex initializes the <code>listData</code> property
		 *  of the component with the appropriate data from the List control.
		 *  The component can then use the <code>listData</code> property
		 *  to initialize the <code>data</code> property of the drop-in
		 *  item renderer or drop-in item editor.
		 *
		 *  <p>You do not set this property in MXML or ActionScript;
		 *  Flex sets it when the component is used as a drop-in item renderer
		 *  or drop-in item editor.</p>
		 *
		 *  @default null
		 *  @see mx.controls.listClasses.IDropInListItemRenderer
		 */
		public function get listData():BaseListData
		{
			return _listData;
		}
		
		/**
		 *  @private
		 */
		public function set listData(value:BaseListData):void
		{
			_listData = value;
		}
		
		private var img:DisplayObject;
		
		/**
		 *  create the image instance now that we know what it is
		 */
		override protected function commitProperties():void
		{
			super.commitProperties();
			
			if (listData)
			{
				// remove the old child if we have one
				if (img)
					removeChild(img);
				
				var c:Class = UIComponent(owner).document[listData.label];
				img = new c();
				img.width = 18;
				img.height = 18;
				addEventListener(MouseEvent.MOUSE_OVER, function(event:Event):void {
					Mouse.cursor = MouseCursor.BUTTON;
				});
				addEventListener(MouseEvent.MOUSE_OUT, function(event:Event):void {
					Mouse.cursor = MouseCursor.AUTO;
				});
				addChild(img);
			}
		}
		
		/**
		 *  create the image instance now that we know what it is
		 */
		override protected function measure():void
		{
			super.measure();
			
			if (img)
			{
				measuredHeight = img.height;
				measuredWidth = img.width;
			}
		}
		
		/**
		 *  center the contentHolder
		 */
		override protected function updateDisplayList(w:Number, h:Number):void
		{
			super.updateDisplayList(w, h);
			
			if (img)
			{
				img.x = (w - img.width) / 2;
			}
		}
		
	}
}