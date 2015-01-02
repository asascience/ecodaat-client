package com.esri.viewer.skins.MultiDropDown
{
    import flash.events.Event;
    import flash.events.KeyboardEvent;
    import flash.events.MouseEvent;
    import flash.ui.Keyboard;
    
    import mx.collections.ArrayCollection;
    import mx.collections.IList;
    import mx.core.mx_internal;
    import mx.events.FlexEvent;
    import mx.events.ItemClickEvent;
    
    import spark.components.DropDownList;
    import spark.events.DropDownEvent;
    import spark.events.IndexChangeEvent;
    import spark.utils.LabelUtil;
    
    use namespace mx_internal;
    
    [Event("itemAdded", type="com.esri.viewer.skins.MultiDropDown.ComboCheckEvent")]
    [Event("itemRemoved", type="com.esri.viewer.skins.MultiDropDown.ComboCheckEvent")]
    [Event("selectAll", type="com.esri.viewer.skins.MultiDropDown.ComboCheckEvent")]
    [Event("deselectAll", type="com.esri.viewer.skins.MultiDropDown.ComboCheckEvent")]
    
    public class ComboCheckList extends DropDownList implements IComboCheckType
    {
        private static const ROW_HEIHGT:int = 18.0;
        private static const GAP_HEIHGT:int = 3.0;
        
        [Bindable]public var dropDownHeight:Number;
        [Bindable]public var rowCount:int;
        [Bindable]public var selectAllLabelField:String;
        [Bindable]public var selectedLabelField:String;
        
        private var selectedAllItems:ArrayCollection;
        private var _selectedItems:Vector.<Object>;
        override public function set selectedItems(value:Vector.<Object>):void {
            super.selectedItems = value;
            _selectedItems = value;
        }
        override public function get selectedItems():Vector.<Object> {
            dispatchEvent(new ComboCheckEvent(ComboCheckEvent.ITEMS_SELECTED));
            return _selectedItems;
        }
        public function getSelectedItems():Vector.<Object> {
            return _selectedItems;
        }
        
        override public function get selectedItem():* {
            dispatchEvent(new ComboCheckEvent(ComboCheckEvent.ITEM_SELECTED));
            return super.selectedItem;
        }
        
        public function getSelectedItem():* {
            return super.selectedItem;
        }
        
        public function setLabel(value:String):void {
            labelDisplay.text = value;
        }
        
        public function ComboCheckList()
        {
            super();
            setStyle("skinClass", ComboCheckListSkin);
            addEventListener(ItemClickEvent.ITEM_CLICK, onItemClick);
            addEventListener(FlexEvent.UPDATE_COMPLETE, onUpdateComplete);
            
            // Initialize object
            selectedItems = new Vector.<Object>();
        }
        
        private function onUpdateComplete(event:FlexEvent):void {
            if (dataProvider != null) {
                removeEventListener(FlexEvent.UPDATE_COMPLETE, onUpdateComplete);
                selectedAllItems = new ArrayCollection();
                var selectAllAtInit:Boolean = false;
                for each (var item:Object in dataProvider) {
                    if (item.hasOwnProperty(selectAllLabelField) && item[selectAllLabelField] == true) {
                        selectedAllItems.addItem(item);
                        if  (item[selectedLabelField] == true) {
                            selectAllAtInit = true;
                        }
                    } else if (item.hasOwnProperty(selectedLabelField) && item[selectedLabelField] == true) {
                        selectedItems.push(item);
                    }
                }
                if (selectAllAtInit) {
                    selectAll();
                    dispatchEvent(new ComboCheckEvent(ComboCheckEvent.SELECT_ALL));
                }
                
                // Redim dropdown menu
                if (isNaN(dropDownHeight) || dropDownHeight == 0) {
                    if (rowCount > dataProvider.length) {
                        dropDownHeight = (dataProvider.length * ROW_HEIHGT) + GAP_HEIHGT;
                    } else {
                        dropDownHeight = (rowCount * ROW_HEIHGT) + GAP_HEIHGT;
                    }
                }
            }
        }
        
        override protected function keyDownHandler(event:KeyboardEvent):void {
            if (event.keyCode == Keyboard.ENTER && isDropDownOpen) {
                var currentItem:Object = dataProvider.getItemAt(event.currentTarget.caretIndex);
                
                if (currentItem != null) {
                    currentItem[selectedLabelField] = !currentItem[selectedLabelField];
                    var e:ItemClickEvent = new ItemClickEvent(ItemClickEvent.ITEM_CLICK, true);
                    e.item = currentItem;
                    dispatchEvent(e);
                    
                    // Update items
                    dataGroup.dataProvider.itemUpdated(currentItem,null,currentItem,e.item);
                }
            }
        }
        
        override protected function keyUpHandler(event:KeyboardEvent):void {
            if (event.keyCode == Keyboard.ENTER) {
                return;
            }
            super.keyDownHandler(event);
            if (event.keyCode == Keyboard.LEFT
                || event.keyCode == Keyboard.RIGHT) {
                closeDropDown(true);
            }
        }
        
        // Don't delete
        override protected function item_mouseDownHandler(event:MouseEvent):void {
        }
        
        override protected function dropDownController_closeHandler(event:DropDownEvent):void {
            addEventListener(FlexEvent.UPDATE_COMPLETE, close_updateCompleteHandler);
            invalidateSkinState();
            
            if (event.isDefaultPrevented()) {
                changeHighlightedSelection(selectedIndex);
            }
        }
        
        private function close_updateCompleteHandler(event:FlexEvent):void {   
            removeEventListener(FlexEvent.UPDATE_COMPLETE, close_updateCompleteHandler);
            dispatchEvent(new DropDownEvent(DropDownEvent.CLOSE));
        }
        
        private function onItemClick(event:ItemClickEvent):void {
            var evt:ComboCheckEvent;
            
            if (event.item[selectedLabelField])  {
                if (event.item.hasOwnProperty(selectAllLabelField) && event.item[selectAllLabelField] == true) {
                    selectAll();
                    dispatchEvent(new ComboCheckEvent(ComboCheckEvent.SELECT_ALL));
                } else {
                    selectedItems.push(event.item);
                    
                    // AddItem
                    evt = new ComboCheckEvent(ComboCheckEvent.ITEM_ADDED);
                    evt.data = event.item;
                    dispatchEvent(evt);
                    
                    if (selectedItems.length == dataProvider.length - selectedAllItems.length) {
                        updateItemsAll(true);
                    }
                }
                selectedItem = event.item;
                selectedIndex = dataProvider.getItemIndex(event.item);
                dispatchEvent(new IndexChangeEvent(IndexChangeEvent.CHANGE));
            } else {
                if (event.item.hasOwnProperty(selectAllLabelField) && event.item[selectAllLabelField] == true) {
                    deselectAll();
                    dispatchEvent(new ComboCheckEvent(ComboCheckEvent.DESELECT_ALL));
                } else {
                    var index:int = selectedItems.indexOf(event.item);
                    selectedItems.splice(index, 1);
                    
                    updateItemsAll(false);
                    
                    // RemoveItem
                    evt = new ComboCheckEvent(ComboCheckEvent.ITEM_REMOVED)
                    evt.data = event.item;
                    dispatchEvent(evt);
                }
                selectedItem = null;
                selectedIndex = -1;
                dispatchEvent(new IndexChangeEvent(IndexChangeEvent.CHANGE));
            }
            
            dispatchEvent(new ComboCheckEvent(ComboCheckEvent.ITEM_SELECTED));
        }
        
        // Display 'allItem' selected or not selected
        private function updateItemsAll (value:Boolean):void {
            for each (var item:* in selectedAllItems) {
                item[selectedLabelField] = value;
                dataProvider.itemUpdated(item,'selected',!value,value);
            }
        }
        
        public function selectAll():void {
            selectedItems = new Vector.<Object>();
            for each (var item:* in dataProvider) {
                item[selectedLabelField] = true;
                if (!item.hasOwnProperty(selectAllLabelField)) {
                    selectedItems.push(item);
                }
            }
            refreshDropDown();
        }
        
        public function deselectAll():void {
            selectedItems = new Vector.<Object>();
            for each (var item:* in dataProvider) {
                item[selectedLabelField] = false;
            }
            refreshDropDown();
        }
        
        private function refreshDropDown():void {
            for each(var obj:Object in dataProvider){
                dataProvider.itemUpdated(obj);
            }
            // 'ArrayCollection(dataProvider).refresh();' Refresh collection but force scroll to top
        }
    }
}