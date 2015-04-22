/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 1/28/15.
 */



/*
 *
 * ======================================================
 * We follow the vis template of init - wrangle - update
 * ======================================================
 *
 * */

/**
 * PrioVis object for HW3 of CS171
 * @param _parentElement -- the HTML or SVG element (D3 node) to which to attach the vis
 * @param _data -- the data array
 * @param _metaData -- the meta-data / data description object
 * @constructor
 */
EthHist = function(_parentElement, _data, _metaData){
    this.parentElement = _parentElement;
    this.data = _data;
    this.metaData = _metaData;
    this.displayData = [];

    var that = this;



    // TODO: define all constants here
    this.width = getInnerWidth(this.parentElement);
    this.height = 190;

    this.innerwidth = 50;
    this.outerwidth = this.width - 10;
    this.topheight = 10;
    this.outerheight = 160;

    this.linewidth = 3

    this.y = d3.scale.linear().range([this.topheight, this.outerheight]);
    this.x = d3.scale.ordinal().rangeRoundBands([this.innerwidth, this.outerwidth], .1);

    this.xAxis = d3.svg.axis()
      .scale(this.x)
      .orient("bottom");

    this.yAxis = d3.svg.axis()
      .scale(this.y)
      .orient("left");

    this.initVis();

}


/**
 * Method that sets up the SVG and the variables
 */
EthHist.prototype.initVis = function(){

    var that = this; // read about the this


    //TODO: construct or select SVG
    //TODO: create axis and scales

    this.svg = this.parentElement.append("svg")
                .attr("height", this.height)
                .attr("width", this.width)
    
    // Add axes visual elements

    this.svg.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + this.innerwidth + ",0)")

    this.svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + this.outerheight + ")")

    // filter, aggregate, modify data
    this.wrangleData(null);

    // call the update method
    this.updateVis();
}


/**
 * Method to wrangle the data. In this case it takes an options object
 * @param _filterFunction - a function that filters data or "null" if none
 */
EthHist.prototype.wrangleData= function(_filterFunction){

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
EthHist.prototype.updateVis = function(){

    var that = this;

    this.y.domain([d3.max(this.displayData, function(i) { return i.values}) , 0]);
    hi = []
    function shorten_names(key) {
        dict = {"White/Caucasian": "White", "Asian/Pacific American": "Asian", "Hispanic/Latino":"Hispanic", "Black/African American":"African American", "Indian/Native American":"Native American", "Other":"Other", "Hawaiian/Pacific Islander":"Hawaiian", "Two or More Ethnicities":"Multiple"}
        return dict[key];
    }

    this.x.domain(this.displayData.map(function(d,i) { return shorten_names(d.key) }))

    var barWidth = this.outerwidth / this.displayData.length;

    d3.selectAll(".text").remove();

    this.svg.select(".x.axis")
        .call(this.xAxis)

    this.svg.select(".y.axis")
        .call(this.yAxis)

    this.svg.selectAll(".bar").remove();

    var barchart = this.svg.selectAll(".bar")
        .data(this.displayData)

    cmap = {'Hawaiian/Pacific Islander': '#aec7e8', 'Other': '#ff7f0e', 'White/Caucasian':'#ffbb78', 'Indian/Native American':'#2ca02c', 'Black/African American':'#9467bd', 'Asian/Pacific American':'#d62728', 'Hispanic/Latino':'#ff9896', 'Two or More Ethnicities':'#98df8a'}

    barchart.enter().append("rect")
        .attr("class", "bar")
        .attr("x", function(d,i) { return that.x(shorten_names(d.key)); } )
        .attr("y", function(d) { return that.y(d.values) } )
        .attr("height", function(d) { return that.outerheight - that.y(d.values); } )
        .attr("width", this.x.rangeBand() )
        .attr("fill", function(d,i) { return cmap[d.key]; });

}


/**
 * Gets called by event handler and should create new aggregated data
 * aggregation is done by the function "aggregate(filter)". Filter has to
 * be defined here.
 * @param selection
 */
EthHist.prototype.onSelectionChange= function (selectionStart, selectionEnd){

    this.wrangleData(null);

    this.updateVis();


}


/*
*
* ==================================
* From here on only HELPER functions
* ==================================
*
* */


/**
 * The aggregate function that creates the counts for each age for a given filter.
 * @param _filter - A filter can be, e.g.,  a function that is only true for data of a given time range
 * @returns {Array|*}
 */
EthHist.prototype.filterAndAggregate = function(_filter){
    // Set filter to a function that accepts all items
    // ONLY if the parameter _filter is NOT null use this parameter
    var filter = function(){return true;}
    if (_filter != null){
        filter = _filter;
    }
    //Dear JS hipster, a more hip variant of this construct would be:
    // var filter = _filter || function(){return true;}

    // define date filters
    var date_start = document.getElementsByName("start")[0].value
    if (date_start == ''){
        date_start = '01/01/2014'
        $("#startdate").val('01/01/2014')
    }
    date_start = new Date(date_start.slice(6) + '-' + date_start.slice(0, 2) + '-' + date_start.slice(3, 5))
    date_start = new Date(date_start.getTime() + 1000*60*60*6);

    var date_end = document.getElementsByName("end")[0].value
    if (date_end == ''){
        date_end = '04/01/2015'
        $("#enddate").val('04/01/2015')
    }
    date_end = new Date(date_end.slice(6) + '-' + date_end.slice(0, 2) + '-' + date_end.slice(3, 5))
    date_end = new Date(date_end.getTime() + 1000*60*60*6);
    
    // define party filter
    var party_filter = document.getElementById("filter-party").value
    party_filter = party_filter.replace("Republican", "R").replace("Democrat", "D")
    // define ethnicity filter
    var ethnicity_filter = document.getElementById("filter-ethnicity").value

    // define religion filter
    var religion_filter = document.getElementById("filter-religion").value

    var person_filter = document.getElementById("filter-member").value

    var sponsor_filter = document.getElementById("filter-sponsor").value

    var committee_filter = document.getElementById("filter-committee").value

    var country_filter = document.getElementById("filter-country").value
    var state_filter = document.getElementById("filter-state").options[document.getElementById("filter-state").selectedIndex].text
    if(state_filter != '') {
        $("#filter-country").val('United States').trigger('chosen:updated')
    }

    var that = this;
    data = that.data;

    filtered_data = []

    data.forEach(function(d, i){
      var departure_date = new Date(d.departure_date)
      if (departure_date > date_start && departure_date < date_end){
        if (d.party == party_filter || party_filter == ''){
          if (d.ethnicity == ethnicity_filter || ethnicity_filter == ''){
            if (d.person == person_filter || person_filter == ''){
              if (d.destination_country == country_filter || country_filter == ''){
                if (d.destination_state == state_filter || state_filter == ''){
                  if (d.religion == religion_filter || religion_filter == ''){ 
                    var committees = d.committees.replace('["', '').replace('"]', '').split('", "')
                    if (committees.indexOf(committee_filter) > -1 || committee_filter == ''){
                      var sponsors = d.sponsor.replace('["', '').replace('"]', '').split('", "')
                      if (sponsors.indexOf(sponsor_filter) > -1 || sponsor_filter == ''){
                        filtered_data.push(d)
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })


    var ethnicity_aggregated = d3.nest()
        .key(function(d) {return d.ethnicity })
        .rollup(function(d) {
            return d3.sum(d, function(g) {return 1; });
        }).entries(filtered_data);

    ethnicity_aggregated = ethnicity_aggregated.filter(function(i) {return i.key != 'null' })

    return ethnicity_aggregated
}
