package com.esri.viewer.skins.MultiDropDown
{
    import flash.display.DisplayObject;
    
    import mx.collections.ArrayCollection;
    import mx.collections.IList;
    import mx.core.UIComponent;
    
    import spark.components.ComboBox;
    import spark.components.DropDownList;
    import spark.events.IndexChangeEvent;
    
    [Event("change", type="spark.events.IndexChangeEvent")]
    
    [Event("itemAdded", type="com.esri.viewer.skins.MultiDropDown.ComboCheckEvent")]
    [Event("itemRemoved", type="com.esri.viewer.skins.MultiDropDown.ComboCheckEvent")]
    [Event("itemSelected", type="com.esri.viewer.skins.MultiDropDown.ComboCheckEvent")]
    [Event("itemsSelected", type="com.esri.viewer.skins.MultiDropDown.ComboCheckEvent")]
    [Event("selectAll", type="com.esri.viewer.skins.MultiDropDown.ComboCheckEvent")]
    [Event("deselectAll", type="com.esri.viewer.skins.MultiDropDown.ComboCheckEvent")]
    
    public class ComboCheck extends UIComponent implements IComboCheck
    {
        private static const DEFAULT_HEIGHT:int = 23;
        private static const DEFAULT_WIDTH:int = 115;
        private static const DEFAULT_TYPE:String = "combobox";
        private static const DEFAULT_LABEL:String = "label";
        private static const DEFAULT_ROWCOUNT:int = 8;
        private static const DEFAULT_SELECT_ALL:String = "selectAll";
        private static const DEFAULT_SELECTED:String = "selected";
        
        private var _type:String;
        //[Bindable]Inspectable("combobox", enumeration="combobox,combolist")] 
        public function set type (value:String):void {
            _type = value;
            createCombo();
        }
        public function get type ():String {
            return _type;
        }
		private var _selectedAll:Boolean = false;
		
		public function set selectedAll (value:Boolean):void {
			_selectedAll = value;
		}
		public function get selectedAll():Boolean {
			return _selectedAll;
		}
		private var _selectedNum:Number = 0;
		
		public function set selectedNum (value:Number):void {
			_selectedNum = value;
		}
		public function get selectedNum():Number {
			return _selectedNum;
		}
        private var _dataProvider:IList;
        public function set dataProvider(value:IList):void {
            _dataProvider = value;
            combo.dataProvider = value;
        }
        public function get dataProvider():IList {
            return _dataProvider as IList;
        }
        
        private var combo:IComboCheckType;
        public function get component ():IComboCheckType {
            return combo;
        }
        
        private var _labelField:String;
        [Bindable]public function set labelField (value:String):void {
            _labelField = value;
            combo.labelField = value;
        }
        public function get labelField ():String {
            return _labelField;
        }
        
        private var _labelToItemFunction:Function;
        [Bindable]public function set labelToItemFunction (value:Function):void {
            _labelToItemFunction = value;
            if (type == 'combobox') {
                ComboBox(combo).labelToItemFunction = value;
            }
        }
        public function get labelToItemFunction ():Function {
            return _labelToItemFunction;
        }
        
        private var _labelFunction:Function;
        [Bindable]public function set labelFunction (value:Function):void {
            _labelFunction = value;
            combo.labelFunction = value;
        }
        public function get labelFunction ():Function {
            return _labelFunction;
        }
        
        private var _selectedIndex:int;
        [Bindable]public function set selectedIndex (value:int):void {
            _selectedIndex = value;
            combo.selectedIndex = value;
        }
        public function get selectedIndex ():int {
            return _selectedIndex;
        }
        
        private var _rowCount:int;
        [Bindable]public function set rowCount (value:int):void {
            _rowCount = value;
            combo.rowCount = value;
        }
        public function get rowCount ():int {
            return _rowCount;
        }
        
        private var _selectedItem:*;
        [Bindable ("itemSelected")]
        public function set selectedItem(value:*):void {
            _selectedItem = value;
        }
        public function get selectedItem():* {
            return combo.getSelectedItem();
        }
		
		//this is the constructor that prepares the sql line for the dynamic multi option combo box
		public function get selectedViewsSQL():String 
		{
			if(selectedAll == false)
			{
				var multiSelect:ArrayCollection = combo.dataProvider as ArrayCollection;
				var sqlString:String = "";
				var selectedList:ArrayCollection = new ArrayCollection;
				for (var ms:int = 1; ms < multiSelect.length; ms++) {
					if(multiSelect[ms].selected == true)
					{
						selectedList.addItem(multiSelect[ms]);
					}
				}
				if(selectedList.length == 0)
				{
					selectedNum = 0;
					return "noneSelected";
				}
				else{
					if (selectedList.length < 2) {
						sqlString = "='"+selectedList[0].alias+"'";
						return sqlString;
					} else {
						sqlString = "IN('";
						for (var ms2:int = 0; ms2 < selectedList.length; ms2++) {
							sqlString+= selectedList[ms2].alias;
							if(ms2< selectedList.length-1)
							{
								sqlString+="','";
							}
						}
						//var newStringSQL:String = sqlString.slice( 0, -1 );
						return sqlString+= "')";
					}
				}
				
			}
			else{
				var sqlStringAll:String = "IN('";
				//don't grab the select all item
				for (var dl:int = 1; dl < combo.dataProvider.length; dl++)
				{	
					sqlStringAll+= combo.dataProvider[dl].alias;
					if(dl< combo.dataProvider.length-1)
					{
						sqlStringAll+="','";
					}
				}
				return sqlStringAll+= "')";
			}
		}
        
        private var _selectedItems:Vector.<Object>;
        [Bindable ("itemsSelected")]
        public function set selectedItems (value:Vector.<Object>):void {
            _selectedItems = value;
        }
        public function get selectedItems ():Vector.<Object> {
            return combo.getSelectedItems();
        }
        
        private var _dropDownHeight:Number;
        [Bindable]public function set dropDownHeight (value:Number):void {
            _dropDownHeight = value;
            combo.dropDownHeight = value;
        }
        public function get dropDownHeight ():Number {
            return _dropDownHeight;
        }
        
        private var _selectAllLabelField:String;
        [Bindable]public function set selectAllLabelField (value:String):void {
            _selectAllLabelField = value;
            combo.selectAllLabelField = value;
        }
        public function get selectAllLabelField ():String {
            return _selectAllLabelField;
        }
        
        private var _selectedLabelField:String;
        [Bindable]public function set selectedLabelField (value:String):void {
            _selectedLabelField = value;
            combo.selectedLabelField = value;
        }
        public function get selectedLabelField ():String {
            return _selectedLabelField;
        }
        
        public function setLabel(value:String):void {
            combo.setLabel(value);
        }
        
        private var _prompt:String;
        [Bindable]public function set prompt (value:String):void {
            _prompt = value;
            combo.prompt = value;
        }
        public function get prompt ():String {
            return _prompt;
        }
        
        public function ComboCheck()
        {
            super();
            
            // Initialize default properties
            height = DEFAULT_HEIGHT;
            width = DEFAULT_WIDTH;
            type = DEFAULT_TYPE;
            labelField = DEFAULT_LABEL;;
            rowCount = DEFAULT_ROWCOUNT;
            selectAllLabelField = DEFAULT_SELECT_ALL;
            selectedLabelField = DEFAULT_SELECTED;
        }
        
        private function createCombo():void {
            switch(type) {
                case "combobox": 
                    combo = new ComboCheckBox();
                    break;
                case "combolist":
                    combo = new ComboCheckList();
                    break;
                default:
                    combo = new ComboCheckBox();
                    break;
            }
            
            UIComponent(combo).addEventListener(ComboCheckEvent.ITEM_SELECTED, onItemSelected);
            UIComponent(combo).addEventListener(ComboCheckEvent.ITEMS_SELECTED, onItemsSelected);
            UIComponent(combo).addEventListener(ComboCheckEvent.ITEM_REMOVED, onItemRemoved);
            UIComponent(combo).addEventListener(ComboCheckEvent.ITEM_ADDED, onItemAdded);
            UIComponent(combo).addEventListener(ComboCheckEvent.SELECT_ALL, onSelectAll);
            UIComponent(combo).addEventListener(ComboCheckEvent.DESELECT_ALL, onDeselectAll);
            
            UIComponent(combo).addEventListener(IndexChangeEvent.CHANGE, onChange);
            
            // Init combo values
            combo.selectedLabelField = selectedLabelField;
            combo.selectAllLabelField = selectAllLabelField;
            combo.rowCount = rowCount;
        }
        
        private function onItemSelected (event:ComboCheckEvent):void {
            dispatchEvent(new ComboCheckEvent(ComboCheckEvent.ITEM_SELECTED));
        }
        
        private function onItemsSelected (event:ComboCheckEvent):void {
            dispatchEvent(new ComboCheckEvent(ComboCheckEvent.ITEMS_SELECTED));
        }
        
        private function onSelectAll (event:ComboCheckEvent):void {
            dispatchEvent(new ComboCheckEvent(ComboCheckEvent.SELECT_ALL));
        }
        
        private function onDeselectAll (event:ComboCheckEvent):void {
            dispatchEvent(new ComboCheckEvent(ComboCheckEvent.DESELECT_ALL));
        }
        
        private function onChange (event:IndexChangeEvent):void {
            dispatchEvent(new IndexChangeEvent(IndexChangeEvent.CHANGE));
        }
        
        private function onItemAdded (event:ComboCheckEvent):void {
            var evt:ComboCheckEvent = new ComboCheckEvent(ComboCheckEvent.ITEM_ADDED);
            evt.data = event.data;
            dispatchEvent(evt);
        }
        
        private function onItemRemoved (event:ComboCheckEvent):void {
            var evt:ComboCheckEvent = new ComboCheckEvent(ComboCheckEvent.ITEM_REMOVED);
           
			//This is conditional to see if the Select All button is true or false
			if(event.currentTarget.selectedItem!= null && event.currentTarget.selectedItem.alias == "SELECT ALL"){
				if(event.currentTarget.selectedItem.selected == false){
					selectedAll = false;
				}
				else{
					selectedAll = true;
				}
					
			}
			evt.data = event.data;
            dispatchEvent(evt);
        }
        
        override protected function commitProperties():void {
            super.commitProperties();
        }
        
        override protected function createChildren():void {
            super.createChildren();
            addChild(combo as DisplayObject)
        }
        
        override protected function measure():void {
            super.measure();
        }
        
        override protected function updateDisplayList(unscaledWidth:Number, unscaledHeight:Number):void {
            super.updateDisplayList(unscaledWidth, unscaledHeight);
            UIComponent(combo).setActualSize(width, height);
        }
		
		public function deselectAll():void {
			combo.deselectAll();
		}
        public function selectAll():void {
            combo.selectAll();
        }
    }
}