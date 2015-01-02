package com.esri.viewer.skins.MultiDropDown
{
    import flash.events.Event;
    
    public class ComboCheckEvent extends Event
    {
        public static const ITEM_ADDED:String = "itemAdded";
        public static const ITEM_REMOVED:String = "itemRemoved";
        public static const ITEM_SELECTED:String = "itemSelected";
        public static const ITEMS_SELECTED:String = "itemsSelected";
        public static const SELECT_ALL:String = "selectAll";
        public static const DESELECT_ALL:String = "deselectAll";
        
        public var data:*;
        public function ComboCheckEvent(type:String, bubbles:Boolean=false, cancelable:Boolean=false)
        {
            super(type, bubbles, cancelable);
        }
    }
}