////////////////////////////////////////////////////////////////////////////////
//
// This is a modification of ESRIs CheckBoxInderminateIcon that
// gives the ability to show a layers scale dependancy
//
////////////////////////////////////////////////////////////////////////////////

package com.esri.viewer.components.toc_legend.controls
{
	import flash.display.BitmapData;
	import flash.geom.ColorTransform;
	import flash.geom.Rectangle;
	import mx.skins.halo.CheckBoxIcon;

	
	/**
	 * CheckBox skin that supports a tri-state check. In addition to selected and
	 * unselected, the CheckBox can be in an scale dependant state.
	 */
	public class CheckBoxScaleDependantIcon extends CheckBoxIcon
	{
		/**
		 * @private
		 */
		[Bindable]
		[Embed(source="../../images/sd_overlay.png")]
		private var sdIcon:Class;
		
		override protected function updateDisplayList( w:Number, h:Number ):void
		{
			super.updateDisplayList(w, h);

			var scaleDep:Boolean = getStyle("scaledependant");			
			
			if (scaleDep) {
				var cTransform:ColorTransform = new ColorTransform();
				cTransform.alphaMultiplier = 0.3
				var rect:Rectangle = new Rectangle(0, 0, 14, 14);
				var myBitmap:BitmapData = new sdIcon().bitmapData;
				myBitmap.colorTransform(rect, cTransform);
				graphics.beginBitmapFill(myBitmap, null, false, false);
				graphics.drawRect(0,0,w,h);
				graphics.endFill();
			}
		}
	}
}