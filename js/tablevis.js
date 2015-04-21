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
 * AgeVis object for HW3 of CS171
 * @param _parentElement -- the HTML or SVG element (D3 node) to which to attach the vis
 * @param _data -- the data array
 * @param _metaData -- the meta-data / data description object
 * @constructor
 */
TableVis = function(_parentElement, _data, _metaData, _eventHandler){
    this.parentElement = _parentElement;
    this.data = _data;
    this.eventHandler = _eventHandler;
    this.metaData = _metaData;
    this.displayData = [];
    var that = this;



    // TODO: define all constants here
    this.width = getInnerWidth(this.parentElement);

    this.initVis();

}


/**
 * Method that sets up the SVG and the variables
 */
TableVis.prototype.initVis = function(){

    this.wrangleData(null);

    // call the update method
    this.updateVis();
}

TableVis.prototype.wrangleData= function(_filterFunction){

    // displayData should hold the data which is visualized
    this.displayData = this.filterAndAggregate(_filterFunction);


}


/**
 * the drawing function - should use the D3 selection, enter, exit
 */
TableVis.prototype.updateVis = function(){

    // Dear JS hipster,
    // you might be able to pass some options as parameter _option
    // But it's not needed to solve the task.
    // var options = _options || {};
    d3.selectAll('.table').remove()
    var that = this;
    var columns = ['Member', 'Destination', 'Dates', 'Sponsor', 'Country']
    var table = this.parentElement.append("table").attr("class", "table travel-table table-striped table-condensed table-hover"),
        thead = table.append("thead")
                     .attr("class", "thead");
        tbody = table.append("tbody");
    thead.append("tr").selectAll("th")
            .data(columns)
          .enter()
            .append("th")
            .text(function(d) { return d; })
            .attr("class", function(d) {return d; })
    var rows = tbody.selectAll("tr.row")
        .data(that.displayData)
        .enter()
        .append("tr");

    var cells = rows.selectAll("td")
       .data(function(row) {
            row_condensed = []
            row_condensed.push(row['person'])
            row_condensed.push(row['destination'])

            dep_date = new Date(row['departure_date'])
            dep_date_string = (dep_date.getMonth() + 1) + '/' + dep_date.getDate() + '/' +  dep_date.getFullYear()

            ret_date = new Date(row['return_date'])
            ret_date_string = (ret_date.getMonth() + 1) + '/' + ret_date.getDate() + '/' +  ret_date.getFullYear()

            row_condensed.push(dep_date_string + ' to ' + ret_date_string)
            row_condensed.push(row['sponsor'].replace('["', '').replace('"]', '').split('", "').join())
            row_condensed.push(row['destination_country'])
            return d3.range(columns.length).map(function(column, i) {
                return [row_condensed[i], columns[i]]
            });
        })
        .enter()
        .append("td")
        .text(function(d) {
            return d[0]
        })
        .attr("class", function(d) {
            return d[1]
        })
        .attr("style", "cursor: pointer")

    $("td.Dates").click(function() { 
        dates = $(this).html().split(' to ');
        $("#enddate").datepicker('update',dates[1])
        $("#startdate").datepicker('update',dates[0])
     });

    $("td.Destination").click(function() {
        val = $(this).next().next().next().html()
        $("#filter-country").val(val).trigger('chosen:updated')
        $("#changed").change();
    })

    $("td.Sponsor").click(function() {
        val = $(this).html()
        $("#filter-sponsor").val(val).trigger('chosen:updated')
        $("#changed").change();
    })

    $("td.Member").click(function() {
        val = $(this).html()
        $("#filter-member").val(val).trigger('chosen:updated')
        $("#changed").change();
    })


    // TODO: implement...
    // TODO: ...update scales
    // TODO: ...update graphs

}


/**
 * Gets called by event handler and should create new aggregated data
 * aggregation is done by the function "aggregate(filter)". Filter has to
 * be defined here.
 * @param selection
 */
TableVis.prototype.onSelectionChange= function (){

    this.wrangleData(null);

    this.updateVis();


}

TableVis.prototype.filterAndAggregate = function(_filter){
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
    d3.select('.begin-date').html(date_start.toDateString());

    var date_end = document.getElementsByName("end")[0].value
    if (date_end == ''){
        date_end = '04/01/2015'
        $("#enddate").val('04/01/2015')
    }
    date_end = new Date(date_end.slice(6) + '-' + date_end.slice(0, 2) + '-' + date_end.slice(3, 5))
    date_end = new Date(date_end.getTime() + 1000*60*60*6);
    d3.select('.end-date').html(date_end.toDateString());
    
    var left = ($('#mapVis').width() - $('.date').width())/2;
    d3.select('.date').style('left', String(left)+'px');
    d3.select('.date').style('display', 'inline');
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

    var viztype = document.getElementById("viztype").value;

    //coloring
    var color_by = document.getElementById("color-by").value
    color_map = {'party': {'R': 'red', 'D': 'blue'}}
    ethmap = d3.scale.category20().domain(this.metaData["ethnicities"])
    relmap = d3.scale.category20c().domain(this.metaData["religions"])
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
    return filtered_data
}



