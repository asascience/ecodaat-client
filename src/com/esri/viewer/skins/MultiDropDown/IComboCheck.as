package com.esri.viewer.skins.MultiDropDown
{
    import mx.collections.IList;

    public interface IComboCheck
    {
        function get type():String;
        function set type(value:String):void;
		
		function get selectedAll():Boolean;
		function set selectedAll(value:Boolean):void;
        
        function get dataProvider():IList;
        function set dataProvider(value:IList):void;
        
        function get component():IComboCheckType;
        
        function get labelField():String;
        function set labelField(value:String):void;
        
        function get labelToItemFunction():Function;
        function set labelToItemFunction(value:Function):void;
        
        function get labelFunction():Function;
        function set labelFunction(value:Function):void;
        
        function get selectedIndex():int;
        function set selectedIndex(value:int):void;
        
        function get rowCount():int;
        function set rowCount(value:int):void;
        
        function get selectedItem():*;
        function set selectedItem(value:*):void;
        
        function get selectedItems():Vector.<Object>;
        function set selectedItems(value:Vector.<Object>):void;
        
        function get dropDownHeight():Number;
        function set dropDownHeight(value:Number):void;
        
        function get selectAllLabelField():String;
        function set selectAllLabelField(value:String):void;
        
        function get selectedLabelField():String;
        function set selectedLabelField(value:String):void;
        
        /*
        function get label():String;
        function set label(value:String):void;
        */
        function setLabel(value:String):void;
        
        function get prompt():String;
        function set prompt(value:String):void;
        
        function selectAll():void;
        function deselectAll():void;
    }
}