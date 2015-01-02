////////////////////////////////////////////////////////////////////////////////
//
// Delevoped by Robert Scheitlin
//
////////////////////////////////////////////////////////////////////////////////
package widgets.Identify
{
	import mx.core.ClassFactory;
	import spark.components.DataGroup;
	
	// these events bubble up from the idResultItemRenderer
	[Event(name="idResultClick", type="flash.events.Event")]
	[Event(name="idResultOver", type="flash.events.Event")]
	[Event(name="idResultOut", type="flash.events.Event")]
	
	public class IdResultDataGroup extends DataGroup
	{
		public function IdResultDataGroup()
		{
			super();
			this.itemRenderer = new ClassFactory(IdResultItemRenderer);
		}
	}
}