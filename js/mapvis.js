/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 1/28/15.
 */


//TODO: DO IT ! :) Look at agevis.js for a useful structure

MapVis = function(_parentElement, _data, _eventHandler){
    this.parentElement = _parentElement;
    this.data = _data;
    this.eventHandler = _eventHandler;
    this.displayData = [];

    // define all constants here
    this.margin = {top: 10, right: 10, bottom: 10, left: 10},
    this.width = getInnerWidth(this.parentElement) - this.margin.left - this.margin.right;
    this.height = 500 - this.margin.top - this.margin.bottom;

    this.initVis();
}

/**
 * Method that sets up the SVG and the variables
 */
MapVis.prototype.initVis = function(){

    var that = this; // read about the this

    this.color = d3.scale.category20();

    this.xAxis = d3.svg.axis()
      .scale(this.x)
      .orient("bottom");

    this.yAxis = d3.svg.axis()
      .scale(this.y)
      .ticks(6)
      .orient("left");

    // filter, aggregate, modify data
    this.wrangleData(null);

    // call the update method
    this.updateVis();
}

/**
 * Method to wrangle the data. In this case it takes an options object
 * @param _filterFunction - a function that filters data or "null" if none
 */
MapVis.prototype.wrangleData= function(_filterFunction){

    // displayData should hold the data which is visualized
    this.displayData = this.filterAndAggregate(_filterFunction);
    //// you might be able to pass some options,
    //// if you don't pass options -- set the default options
    //// the default is: var options = {filter: function(){return true;} }
    //var options = _options || {filter: function(){return true;}};
}

/**
 * the drawing function - should use the D3 selection, enter, exit
 */
MapVis.prototype.updateVis = function(){
    // Dear JS hipster,
    // you might be able to pass some options as parameter _option
    // But it's not needed to solve the task.
    // var options = _options || {};
    var that = this;
    arcs = this.displayData


        var map = new Datamap({
            scope: 'world',
            element: document.getElementById('mapVis'),
            projection: 'equirectangular',
            fills: {
              defaultFill: "#ABDDA4",
            },
            projectionConfig: {
              rotation: [97,-30]
            },
            data: {
              'USA': {fillKey: 'lt50' },
              'MEX': {fillKey: 'lt25' },
              'CAN': {fillKey: 'gt50' },     
              'GTM': {fillKey: 'gt500'},
              'HND': {fillKey: 'eq50' },
              'BLZ': {fillKey: 'pink' },
              'GRL': {fillKey: 'eq0' },
              'CAN': {fillKey: 'gt50' }       
            }
        });

        map.graticule();

        map.arc(arcs, {
            greatArc: true,
            animationSpeed: 2000
        });

}

/**
 * Gets called by event handler and should create new aggregated data
 * aggregation is done by the function "aggregate(filter)". Filter has to
 * be defined here.
 * @param selection
 */
MapVis.prototype.onSelectionChange= function (selectionStart, selectionEnd){
    // TODO: call wrangle function
    this.wrangleData(null);
    this.updateVis();
}

/**
 * The aggregate function that creates the counts for each age for a given filter.
 * @param _filter - A filter can be, e.g.,  a function that is only true for data of a given time range
 * @returns {Array|*}
 */
MapVis.prototype.filterAndAggregate = function(_filter){
    // Set filter to a function that accepts all items
    // ONLY if the parameter _filter is NOT null use this parameter
    var filter = function(){return true;}
    if (_filter != null){
        filter = _filter;
    }
    //Dear JS hipster, a more hip variant of this construct would be:
    // var filter = _filter || function(){return true;}
    arcs = [{
            origin: {
                latitude: 61,
                longitude: -149
            },
            destination: {
                latitude: -22,
                longitude: -43
            }
            }]
    var that = this;
    data = that.data;
    console.log("FILTERING DATA")
    var arcs = []
    data.forEach(function(d, i){
      if (d.departure_date > "2014-01-01"){
        thistrip = {}
        thistrip.origin = {}
        thistrip.destination = {}
        thistrip.origin.latitude = d.departure_latitude
        thistrip.origin.longitude = d.departure_longitude
        thistrip.destination.latitude = d.destination_latitude
        thistrip.destination.longitude = d.destination_longitude
        arcs.push(thistrip)
      }
      //console.log(d)
    })
    // create an array of values for age 0-100
    var res = d3.range(16).map(function () {
        return [0, 0, 0];
    });

    return arcs;
}






















