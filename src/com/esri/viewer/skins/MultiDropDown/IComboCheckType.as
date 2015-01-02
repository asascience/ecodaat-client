package com.esri.viewer.skins.MultiDropDown
{
    import flash.display.DisplayObject;
    
    import mx.collections.IList;
    
    import spark.components.supportClasses.DropDownListBase;

    public interface IComboCheckType
    {
        function set dataProvider(value:IList):void;
        function get dataProvider():IList;
        
        function get labelField():String;
        function set labelField(value:String):void;
        
        function getSelectedItem():*;
        function getSelectedItems():Vector.<Object>;
        
        function set selectedIndex(value:int):void;
        function get selectedIndex():int;
        
        function get labelFunction ():Function;
        function set labelFunction (value:Function):void;
        
        function get rowCount():int;
        function set rowCount(value:int):void;
        
        function get dropDownHeight():Number;
        function set dropDownHeight(value:Number):void;
        
        function get selectAllLabelField():String;
        function set selectAllLabelField(value:String):void;
        
        function get selectedLabelField():String;
        function set selectedLabelField(value:String):void;
        
        function setLabel(value:String):void;
        
        function get prompt():String;
        function set prompt(value:String):void;
        
        function selectAll():void;
        function deselectAll():void;
    }
}