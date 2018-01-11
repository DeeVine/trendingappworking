import React, {Component} from 'react';
import Modal from "react-modal";
import { Input, Form, Searchbtn } from "../../components/Form";
import { Searched, Searcheditems, FbSearchedItems } from "../../components/Searched";
import Chart from "../../components/Chart";
import Sidenav from "../../components/Sidenav";
import Dropdown from "../../components/Dropdown";
import API from "../../utils/API.js";
import { Details } from "../../components/Details";
import { Restdetails, Restheader } from "../../components/Restdetails";
import { Stats, Statsection } from "../../components/Stats";
import ChartFilter from "../../components/ChartFilter";
import Filter from "../../utils/Filter";
import "./findRestaurant.css";
import numjs from 'numjs';
import Mathy from "../../utils/Mathy.js";
import Yelp from "../../utils/Yelp.js";
import { CSSTransitionGroup } from 'react-transition-group' // ES6
import moment from 'moment';
import geolib from 'geolib';
import PlacesAutocomplete, { geocodeByAddress, getLatLng } from 'react-places-autocomplete';
import Map from "../../utils/Map.js";
import Round from '../../utils/Round'
import ChartDataSet from '../../utils/ChartDataSet'
//Need to pass value from input field
//Style chart and info into one element
//Allow to click on element to view stats
//Create separate chart components/arrays for rating, rating count, checkins, review count, star_rating

class findRestaurant extends Component {

	constructor (props) {
		super(props);
		this.state = {
			restaurantArr: [],
			restaurantName: "Homeroom",
			restaurantInfo: {},
			coordsIdsArr: [],
			restaurantDetails: false,
			restaurantDetailsAvg: {},
			restaurantId: "",
			filter: 'price',
			filterLabel: 'All Restaurants',
			filteredRestaurants: '',
			fbAPIResults: {},
			details: false,
			allTotalAvgs: {},
			totalAvg: "",
			totalVelocityAvg: {},
			totalAvgStatement: " ",
			chartData: [],
			searchedRestaurant: {},
			onSearchClick: false,
			detailsWeeklyStats: {},
			showsidenav: true,
			showline: true,
			showbar: true,
			address: "",
			dropdown: '',
			hidesearch: false,
			modalIsOpen: false,
			searchlogo: true
		};
		this.onChange = (restaurantName) => this.setState({ restaurantName })
		this.openModal = this.openModal.bind(this);
    	this.afterOpenModal = this.afterOpenModal.bind(this);
    	this.closeModal = this.closeModal.bind(this);
	}
  
  componentWillMount() {
		API.AllReviews()
		.then(res => {
			const coordsArr = []
			res.data.forEach(item => {
				coordsArr.push({
					yelpId: item.yelpId,
					coordinates: item.coordinates,
					score: item.trending_score
				})
			})
			// this.findPercentChange(res.data,'checkins', 'checkins')
			// this.findPercentChange(res.data,'rating_count', 'rating_count')
			// this.findPercentChange(res.data,'reviews', 'review_count')
		console.log('BEFORE GEOLOCATE')
		const avgLine = this.findDailyDiffAvg(res.data)

		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(position => {
				// console.log(position)
				let userCoordinates = {
					latitude: position.coords.latitude,
					longitude: position.coords.longitude
				};
        
				this.setState({
					filteredRestaurants: avgLine,
					restaurantInfo: res.data,
					coordsIdsArr: coordsArr,
					userCoordinates: userCoordinates
				})
			})

		} else {
			this.setState({
				filteredRestaurants: avgLine,
				restaurantInfo: res.data,
				coordsIdsArr: coordsArr,
				userCoordinates: null
			})
		}

		})
		.catch(err => console.log(err));

  }

	//handle Submit for Geolocation

	handleFormSubmit = (event) => {
    return Map.geoCode(this.state.restaurantName)
 	};

 	//handle Submit for searchRestaurant//
 	pressEnter = (ev) => {
  	if(ev.keyCode == 13 || ev.hich ==13 ){
  	  	this.searchRestaurant();
  		ev.preventDefault();
  		}
  	};


  	//create labels and data arrays and sets chartData state
	generateChartData = (res) => {
		// const differenceArr = res[0].rating_count;		
		let labels = res.map(checkins => {
			let queryDate = checkins.query_date.replace(/ .*/,'');
			return queryDate;
		})
		//check if current data set is bigger, otherwise leave label state unchanged
		if(labels.length <= this.state.chartData.labels.length) {
			labels = this.state.chartData.labels;
		}
		const data = res.map(checkins => {
			let dataset = {}
			let queryDate = checkins.query_date.replace(/ .*/,'');
			let checkinDiff = checkins.difference;
			dataset = {
				x: queryDate,
				y: checkinDiff
			};
			return dataset;
		})

		//generate random color for new dataset
		const dynamicColors = function() {
            var r = Math.floor(Math.random() * 255);
            var g = Math.floor(Math.random() * 255);
            var b = Math.floor(Math.random() * 255);
            return "rgba(" + r + "," + g + "," + b + ", 0.2)";
        };

        let datalabel = '';

    	let index = this.state.chartData.datasets.findIndex( x => x.label === this.state.restaurantDetails.name)

    	if (index === -1) {
    		datalabel = this.state.restaurantDetails.name
    	}
    	else {
    		datalabel = this.state.restaurantDetails.name + '1'
    	}

    	const labelArray = this.state.chartData.datasets.map(index => {
    		return index.label;
    	})

    	let numberoftimes = labelArray.filter(word => word === this.state.restaurantDetails.name+"1")

		this.setState({
			chartData: {
				labels: labels,
				datasets: this.state.chartData.datasets.concat([
					{
						label: datalabel,
						data: data,
						backgroundColor: [dynamicColors()]
					}
				])
			}
		}, () => {
			console.log(this.state);
		})
	};

    //update state whenever field input changes
  handleInputChange = event => {
		const { name, value } = event.target;
		this.setState({
		  [name]: value
		});
	};

  geoCode = (address) => {
  	geocodeByAddress(address)
    	.then(results => getLatLng(results[0]))
    	.then(latLng => {
    		this.setState({
    			geoCodeAddress: latLng
    		})
    	})
  };

	searchRestaurant = event => {
		this.onSearchClick();
		this.setState ({
			hidesearch:true
		})
		if (this.state.restaurantName) {

			this.geoCode(this.state.restaurantName)

			const nameQue = (data) => {
				API.nameQuery(this.state.restaurantName)
				.then(res => {
					// if no result found, start add new firm functions
					// indexof, if data matches res.data, then take out
					let fbResults = []
					if (res.data[0]) {
						data.forEach(item => {

							if (item.id !== res.data[0].fbId) {
								fbResults.push(item)
							}
						})
					} else {
						fbResults = data
					}
					this.setState({
						fbAPIResults: fbResults,
						searchedRestaurant: res.data,

					})
					// console.log(this.state);
					// this.generateChartData(this.state.restaurantInfo)
				})
				.catch(err => console.log(err));
				
			}

			// searches through fb api before sending it through db api
			const access = 'EAAG0XCqokvMBAPYkq18AYZCRVI1QaWb9HU9ti4PpFL5lZAL32p53Ql1zREzbBi9ikoXwdwgsyZB6Cjv9YjghpfQmWPZCBBtWMnGaqknAecNhQzpBNWKCZCFYM36P0IRP8QSnOlzHdxod6y8mZA3cOpdxlu7XZAtqIv9AhZBXdPyPsAZDZD'
			let url = 'https://graph.facebook.com/v2.7/search'
			let params = {
				type: 'place',
				q: this.state.restaurantName,
				center: '37.8044,-122.2711',
				distance: 10000,
				limit: 100,
				fields: 'name,single_line_address,phone, location,is_permanently_closed',
				access_token: access
			}
			API.APIsearch(url, params)
				.then(res => {
					nameQue(res.data.data)
				})
				.catch(err => console.log(err))

		}
  };

	showDetails = event => {
		const array = []
		const id = event.currentTarget.getAttribute('value');
		API.returnDetails(id)
			.then(res => {
				// console.log(res.data[0])

				let checkinsAvg = Mathy.findRoundedDiffMean(res.data[0].checkins, 'checkins')
				let reviewsAvg = Mathy.findRoundedDiffMean(res.data[0].reviews, 'review_count')
				let ratingsAvg = Mathy.findRoundedDiffMean(res.data[0].rating_count, 'rating_count')
				// console.log(checkinsAvg)
				let diff = Mathy.getDiffwithDate(res.data[0].checkins, 'checkins');
				// console.log(checkinsAvg)
				let ratingDiff = Mathy.getDiffwithDate(res.data[0].rating_count, 'rating_count');
				// console.log(checkinsAvg)
				let reviewDiff = Mathy.getDiffwithDate(res.data[0].reviews, 'review_count');
				let totalAvg = Mathy.findTotalStats(this.state.restaurantInfo)
				let totalVelocityAvg = Mathy.findAvgVelocity(this.state.restaurantInfo)
				let totalWeeklyDiff = this.findTotalWeeklyDiff(res.data[0])
        
				// passes in diff array, skips filterlabel, and passes in avg line data
				// to create data set
				const initialChartData = this.createInitialChartDataSet(diff, null, this.state.filteredRestaurants.checkins, res.data[0])

				this.setState({
					restaurantDetails: res.data[0],
					details: true,
					restaurantDetailsAvg: {
						checkinsAvg: checkinsAvg,
						reviewsAvg: reviewsAvg,
						ratingsAvg: ratingsAvg
					},
					diffArr: diff,
					ratingDiff: ratingDiff,
					reviewDiff: reviewDiff,
					detailsWeeklyStats: totalWeeklyDiff,
					chartData: initialChartData,
					totalAvg: totalAvg,
					totalVelocityAvg: totalVelocityAvg
				})

				this.hidesearch();
				this.setState({
					restaurantName: "",
				})

			})
			.catch(err => console.log(err))
	};
	createInitialChartDataSet = (diffDateArr, filterLabel, avgLineDataSet, firmDetails) => {
		// creates average line's chart data set
		const avgLineChartData = ChartDataSet.createDataSet(avgLineDataSet, 'Average', true)
		const diffDataChartData = ChartDataSet.createDataSet(diffDateArr, firmDetails.name)
		// console.log(avgLineChartData)
		// console.log(diffDataChartData)

		let labels = avgLineDataSet.map(checkins => {
			let queryDate = checkins.query_date.replace(/ .*/,'');
			return queryDate;
		})
		// console.log(labels)

		return {
			labels: labels,
			datasets: [diffDataChartData, avgLineChartData]
		}
	};


	//create labels and data arrays and sets chartData state
	generateChartData = (res, filterLabel) => {
		const newChartData = ChartDataSet.createDataSet(res, filterLabel, true)
		// Have new chart data, next:
		// determine which length is longer bw current and new
    let labels = res.map(checkins => {
        let queryDate = checkins.query_date.replace(/ .*/,'');
        return queryDate;
    })
    if(labels.length <= this.state.chartData.labels.length) {
        labels = this.state.chartData.labels;
    }
    // replace array with new
    // console.log(this.state.chartData)
    let stateDataSet = this.state.chartData.datasets
    stateDataSet.pop()
    stateDataSet.push(newChartData)
    return {
			labels: labels,
			datasets: stateDataSet
		}
	};

	//create an array with differences for all restaurants in restaurantInfo
	findPercentChange = (resData,arraytocheck, arrayvariable) => {
		//array to hold the daily increase in ratings, reviews, checkins
		const allDifferences = []
		//create array with differences for all restaurnts in restaurant info
		resData.map(item => {
			// console.log(item)
			let obj = {}
			let diff = Mathy.getDiffwithDate(item[arraytocheck], arrayvariable)
			obj.yelpId = item.yelpId
			obj.diff = diff
			allDifferences.push(obj)
		})
		// console.log(allDifferences)
		const compareAll = []
		// find difference week over week
		allDifferences.map(item => {
			//object to hold yelpId and weeklyChange
			let compare = {}
			let percentChange1 = 0
			let percentChange2 = 0
			let weeklyChange = 0
			let weeklyChangePercent = 0

			//Switch goes here to determine 7, 14, 21, or 30 days

			//first week
			item.diff.slice(0, 3).map(item => {
				percentChange1 += item.percentChange
			})
			//second week
			item.diff.slice(3, 6).map(item => {
				percentChange2 += item.percentChange
			})
			weeklyChange = percentChange2 - percentChange1
			compare.yelpId = item.yelpId
			compare.weeklyChange = weeklyChange
			compare.weeklyChangePercent = weeklyChange/percentChange1
			compareAll.push(compare)
		})
		const stateParam = arraytocheck + 'change';

		//sort arrays based on weekly percent change in descending order
		let sortedCompare = compareAll.sort(function (a, b) {
				  return b.weeklyChangePercent - a.weeklyChangePercent
				})
				this.setState({
					[stateParam]: sortedCompare
				}, ()=> {
				})
		// this.setState({
		// 	[stateParam]: compareAll
		// }, () => {
		// 		console.log(this.state)
		// 		let sortedCompare = compareAll.sort(function (a, b) {
		// 		  return b.weeklyChangePercent - a.weeklyChangePercent
		// 		})

		// 		this.setState({
		// 			[stateParam]: sortedCompare
		// 		}, ()=> {
		// 			console.log(this.state)
		// 		})

		// 		console.log(sortedCompare)
		// 	})
	};

	loadFilter = (ev, filter) => {
		let query
		if (filter) {
			query = filter
		} else {
			query = ev.target.value
		}
		switch(query) {
			// case 'init':
			// 	this.setState({
			// 		totalAvg: this.state.allTotalAvgs.allTotal,
			// 		totalVelocityAvg: this.state.allTotalAvgVelocitys.allVelocity
			// 	})
			// 	break;
			case 'price':
				const price = this.state.restaurantDetails.price
				this.setState({
					totalAvg: this.state.allTotalAvgs.priceTotal,
					totalVelocityAvg: this.state.allTotalAvgVelocitys.priceVelocity,
					totalAvgStatement: "in the same price group, " + price + ", "
				})
				break;
			case 'all':
				this.setState({
					totalAvg: this.state.allTotalAvgs.allTotal,
					totalVelocityAvg: this.state.allTotalAvgVelocitys.allVelocity,
					totalAvgStatement: " "
				})
				break;
			case 'category':
				let categories = ""
				this.state.restaurantDetails.categories.forEach(item=> {
					categories = categories + item.title + ", "
				})
				this.setState({
					totalAvg: this.state.allTotalAvgs.categoryTotal,
					totalVelocityAvg: this.state.allTotalAvgVelocitys.categoryVelocity,
					totalAvgStatement: "in the same categories, " + categories
				})
				break;
		}


	};

	getTotals = () => {
		// gets price total then sends to getalltotal, then getscategoriestotal
		API.filterSearch('price', this.state.restaurantDetails.price)
		.then(res => {
			const priceData = res.data
			let priceTotal = Mathy.findTotalStats(priceData)
			let priceVelocity = Mathy.findAvgVelocity(priceData)
			getAllTotal(priceTotal, priceData, priceVelocity)
			
		})
		.catch(err => console.log('ERROR: ',err))
		
		const getAllTotal = (priceTotal, priceData, priceVelocity) => {
			const allTotal = Mathy.findTotalStats(this.state.restaurantInfo)
			const allVelocity = Mathy.findAvgVelocity(this.state.restaurantInfo)
			getCategoryTotal(priceTotal, allTotal, priceData, priceVelocity, allVelocity)
		}
		
		const getCategoryTotal = (priceTotal, allTotal, priceData, priceVelocity, allVelocity) => {
			let categoryTotal
			let categories = this.state.restaurantDetails.categories
			let arrFirms = []
			let categoryString = ''
			categories.forEach(item => {
				categoryString += item.alias + ' '
			})
			// console.log(categoryString)
			API.filterSearch('category', categoryString)
			.then(res => {
				let categoryData = res.data
				// console.log(categoryData)
				for (var i = 0; i < categoryData.length; i++) {
					var index = arrFirms.findIndex(x => x.name === categoryData[i].name)

					if (index === -1) {
						arrFirms.push(categoryData[i])
					}	else {
						// console.log('no push')
					}
				}
				categoryTotal = Mathy.findTotalStats(arrFirms)
				const categoryVelocity = Mathy.findAvgVelocity(arrFirms)
				this.setState({
					allTotalAvgs: {
						priceTotal: priceTotal,
						allTotal: allTotal,
						categoryTotal: categoryTotal
					},
					allTotalAvgVelocitys: {
						priceVelocity: priceVelocity,
						allVelocity: allVelocity,
						categoryVelocity: categoryVelocity
					}
				})
				console.log(this.state)
			})
			.catch(err => console.log(err))
		}
	};
									//**************************************//
									//********onClick Functions************//
									//************************************//

	openModal = () => {
    this.setState({modalIsOpen: true});
    this.searchlogo();
  	};

  	afterOpenModal = () => {
    // references are now sync'd and can be accessed.
    this.subtitle.style.color = '#f00';
  	};

  	closeModal = () => {
    this.setState({modalIsOpen: false});
    this.setState({searchlogo: true})
  	};

	onClick = () => {
    		this.setState({ showsidenav: !this.state.showsidenav });
   	};
 
	onSearchClick = () => {
		 	this.setState({ searchIcon: !this.state.searchIcon});
	};

	showline = () => {
			this.setState({ showline: !this.state.showline });
	};

	showbar = () => {
			this.setState({ showbar: !this.state.showbar });
	};


	hidesearch = () => {
			this.setState({ hidesearch: !this.state.hidesearch });
	};

	searchlogo = () => {
		this.setState({ searchlogo: !this.state.searchlogo});
	}

	priceFilteredRestaurants = ev => {
		const value = ev.currentTarget.getAttribute('value')
		// console.log(value);
	 	API.filterSearch('price', value)
	    .then(res => {
	        // console.log(res)
	        let priceAvg = this.findDailyDiffAvg(res.data)
	       	const newChartData = this.generateChartData(priceAvg.checkins, value)
	        this.setState({
	        	chartData: newChartData
	        })
	    })
	    .catch(err => console.log(err))
	};

	dropdown = () => {
		if(this.state.dropdown === "dropdown is-active") {
			this.setState({
				dropdown: "dropdown"
			})
		}
		else {
			this.setState({
				dropdown: "dropdown is-active"
			})
		}
	};


// looks for yelpId via information sent from clicking on
// search result. sends to yelpAPI in utils to pull info
// and send to DB

	getYelpAddToDb = (ev) => {
		// console.log('getYelpAddToDb')
		const id = ev.currentTarget.getAttribute('value')
		const name = ev.currentTarget.getAttribute('data-name')
		const city = ev.currentTarget.getAttribute('data-city')
		const address = ev.currentTarget.getAttribute('data-address')
		let phone
		if (ev.currentTarget.getAttribute('data-phone')) {
			phone = ev.currentTarget.getAttribute('data-phone')
			phone = Yelp.convertPhone(phone)
		} else {
			phone = null
		}
		
		// console.log(phone)
		Yelp.yelpAPI(id, name, address, phone, city)
	};

	findClosestRestaurants = (query) => {
		var geo
		if (this.state.userCoordinates === null) {
			geo = {latitude: 37.82306519999999, longitude: -122.24868090000001}
		} else {
			geo = this.state.userCoordinates
		}
		const compareArr = this.state.coordsIdsArr
		const newArr = []
		// loops through coordsid array, gets distnace from compare and inputs into new array
		compareArr.forEach(item => {
			let coords = item.coordinates
			let distance = geolib.getDistance(geo, coords)
			newArr.push({
				yelpId: item.yelpId,
				distance: distance,
				coordinates: coords,
				score: item.score['7day']['checkins']
			})
			
		})

		// sort by distance
		newArr.sort((a,b) => {
			return a.distance - b.distance
		})

		// take closest 30 and sort by highest score
		const loop = 30 - newArr.length
		const length = loop*-1

		for (let i = 0; i < length; i++) {
			newArr.pop()
		}
		const top10Arr = Filter.getTop10ByScore(newArr)
		// display to HTML
		this.setState({
			top10Distance: top10Arr
		})
		// console.log(this.state)
	};

	//create daily avg from array of multiple restaurants
	findDailyDiffAvg = (filtered_arr) => {

		const dailyAvg = Filter.dailyDiffAvg(filtered_arr)
		// this.setState({
		// 	dailyCheckinAvgObj: dailyAvg
		// })
		return dailyAvg
	};

	findTotalWeeklyDiff = (restaurantDetails) => {
		// returns the sum and percent change object
		const getWeeklyDiffPercentChange = (diffObjArr) => {
			let lastWeekSliced = diffObjArr.slice(-7)
			let previousWeekSliced = diffObjArr.slice(-14, -7)
			let lastSlicedSum = Mathy.findSum(lastWeekSliced, 'difference')
			let previousSlicedSum = Mathy.findSum(previousWeekSliced, 'difference')
			const percentDiff = lastSlicedSum - previousSlicedSum
			// console.log(lastSlicedSum)
			// console.log(previousSlicedSum)
			let finalPercent = percentDiff / previousSlicedSum
			finalPercent = Round(finalPercent * 100, -1)
			if (isNaN(finalPercent)) {
				finalPercent = "N/A"
			} else {
				finalPercent = finalPercent + '%'
			}
			
			return {thisWeekSum: lastSlicedSum, lastWeekSum: previousSlicedSum, percentChange: finalPercent}
		}
		// use restaurant details to pass into array
		// get difftotals for each category
		let checkinsDiff = Mathy.getDiffwithDate(restaurantDetails.checkins, 'checkins')
		let ratingsDiff = Mathy.getDiffwithDate(restaurantDetails.rating_count, 'rating_count')
		let reviewsDiff = Mathy.getDiffwithDate(restaurantDetails.reviews, 'review_count')
		// sum differences from last 7 days in array

		const checkinsObj = getWeeklyDiffPercentChange(checkinsDiff)
		const ratingsObj = getWeeklyDiffPercentChange(ratingsDiff)
		const reviewsObj = getWeeklyDiffPercentChange(reviewsDiff)
		let enoughData = true
		if (restaurantDetails.checkins.length <= 10) {
			enoughData = false
		}
		return {
				checkins: checkinsObj,
				ratings: ratingsObj,
				reviews: reviewsObj,
				enoughData: enoughData
				}
	};
	
	render() {

		const inputProps = {
	      value: this.state.restaurantName,
	      onChange: this.onChange,
	    }

		return (
		<div>
			<div className="wrapper">	
			{/*Main section*/}
				<button onClick={this.findTotalWeeklyDiff}>findTotalWeeklyDiff</button>
				<button onClick={this.findClosestRestaurants}>BLAHHHH</button>
				<button onClick={this.showline}>showline</button> 
				<button onClick={this.showbar}>showbar</button> 

				<button onClick={this.findPercentChange}>finddiffall</button>
				<button onClick={this.hidesearch}>hidesearcharea</button>

				<button onClick={this.openModal}>Open Modal</button>

			        <Modal
			          isOpen={this.state.modalIsOpen}
			          onAfterOpen={this.afterOpenModal}
			          onRequestClose={this.closeModal}
			          contentLabel="Example Modal"
			        >

			          <h2 ref={subtitle => this.subtitle = subtitle}>Hello</h2>
			          <button className="modalClosed" onClick={this.closeModal}>close</button>
			          <div>I am a modal</div>
			          <form>
			            <input />
			            <button>tab navigation</button>
			            <button>stays</button>
			            <button>inside</button>
			            <button>the modal</button>
			          </form>
			        </Modal> 


			{ this.state.searchlogo ? 
				<CSSTransitionGroup
								transitionName="example"
								transitionAppear={true}
								transitionAppearTimeout={500}
								transitionEnter={false}
								transitionLeave={true}>
				<a onClick={this.onSearchClick}>
					<div className="inPut-with-icon">
						<i className="fa fa-search"></i>
					</div>
				</a>
				</CSSTransitionGroup>
			: null }
			
		      	<div className="data-section columns">
		      		<div className="column auto">
		      		{this.state.hidesearch ? (
		      			<div className='columns search-area'>
		      				<div className="column is-12">										
											<div id='search-restaurant'>
													{this.state.searchedRestaurant.length ? (
														<CSSTransitionGroup
													transitionName="example"
													transitionAppear={true}
													transitionAppearTimeout={1500}
													transitionEnter={false}
													transitionLeave={true}>
															<Searched>
																{this.state.searchedRestaurant.map(restaurant => (
																	<Searcheditems className='searcheditems' key={restaurant._id} showDetails={(ev) => this.showDetails(ev)}
																		value={restaurant._id}
																	>              
																		<p> Name of Restaurant: {restaurant.name} </p>
																		<p> Address: {restaurant.location.address}, {restaurant.location.city}, {restaurant.location.state} </p>
																		<p> Data Summary: 
																			<ul>
																				<li>Yelp Rating: {restaurant.rating[0].rating} </li>
																				<li>Yelp URL: <a href={restaurant.yelpURL} target='blank'>{restaurant.name}</a></li>
																			</ul>
																		</p>
																	</Searcheditems>
																	))}
															</Searched>
														</CSSTransitionGroup>
												) : (
												<h3>No Results to Display</h3>
												)}
												<h4> FB API Search results </h4>
												{this.state.fbAPIResults.length ? (
													<CSSTransitionGroup
														transitionName="example"
														transitionAppear={true}
														transitionAppearTimeout={500}
														transitionEnter={false}
														transitionLeave={true}
													>
														<Searched>
															{this.state.fbAPIResults.map(restaurant => (
																<FbSearchedItems className='searcheditems' key={restaurant.id} getYelpAddToDb={(ev) => this.getYelpAddToDb(ev)}
																	value={restaurant.id}
																	dataName={restaurant.name}
																	dataAddress={restaurant.location.street}
																	dataCity={restaurant.location.city}
																	dataPhone={restaurant.phone}
																>
																	<p> Name of Restaurant: {restaurant.name} </p>
																	<p> Address: {restaurant.single_line_address} </p>
																	<p> Phone: {restaurant.phone} </p>
																</FbSearchedItems>
															))}
														</Searched>
													</CSSTransitionGroup>
												) : (
													<h4>No results from Facebook API </h4>
												)}
											</div> 		    
		      				</div>
		      			</div>
		      		) : (
										null
									)}
								{this.state.details ? (
		      				<div className='restaurant-info'>	
		      					<div className='columns'>	      				
		      						<Restheader
		      							rank={this.state.restaurantDetails.rank}		      							
		      							restaurantName={this.state.restaurantDetails.name}
		      							address={this.state.restaurantDetails.location.address}
		      							city={this.state.restaurantDetails.location.city}
		      							state={this.state.restaurantDetails.location.state}
		      							yelpURL={this.state.restaurantDetails.yelpURL}
		      							fb_url={this.state.restaurantDetails.fb_url}
		      							fbRating={this.state.restaurantDetails.star_rating[0].overall_star_rating}
		      							yelpRating={this.state.restaurantDetails.rating[0].rating}
		      							

		      						/>
		      					</div>										
				      			<div className='columns'>		      				
					      			<div className='column is-9'>			 
							      		<Chart className='charts' chartData={this.state.chartData} chartName="Checkins by Date"
							      		 showline={this.state.showline} showbar={this.state.showbar}legendPosition="top"/>
							      	</div>
							      	<div className='column is-3 data-navigation'>							      		
						      			<div className='columns'>
						      				<ChartFilter 
						      					checkClick={this.priceFilteredRestaurants}
						      				>
						      					<Dropdown onClick={this.dropdown} className={this.state.dropdown}/>						      		
						      				</ChartFilter>				      				
						      			</div>
						      			
						      											
											</div>
										</div>
										<div className='columns'>
											<div className='column is-12'>
												<section className='stats-section section'>
													<Statsection
													weeklyStats={this.state.detailsWeeklyStats}
													enoughData={this.state.detailsWeeklyStats.enoughData}
													/>
													
												</section>
											</div>
										</div>
										<div className='columns'>
											<div className='column is-12'>
												<section className='section'>
													<Details
													restaurantDetails={this.state.restaurantDetails}
													getTotals={() => this.getTotals()}
													loadFilter={(ev, filter) => this.loadFilter(ev, filter)}
													detailsAvgs={this.state.restaurantDetailsAvg}
													allTotals={this.state.totalAvg}
													getMean={(arr) => Mathy.getMean(arr)}
													totalVelocityAvg={this.state.totalVelocityAvg}
													totalAvgStatement={this.state.totalAvgStatement}
													/>
												</section>
											</div>
										</div>
									</div>
										) : (
										null
									)}
			    		</div>
			    	</div>

			    	{ this.state.searchIcon ? 
		      			<div className="side-nav column is-12">
			      			<CSSTransitionGroup
								transitionName="example"
								transitionAppear={true}
								transitionAppearTimeout={500}
								transitionEnter={false}
								transitionLeave={true}>
								<div className='searchIcon'>
								<form type="submit">
				      			<input
				      				className="searchBar"
									inputProps={inputProps}
									value={this.state.restaurantName}
									onChange={this.handleInputChange}
									name="restaurantName"
									placeholder="restaurant"
									onKeyDown={this.pressEnter}

								/>
								</form>
								
								</div>
				      		</CSSTransitionGroup>
			      		</div>  		
		      		: null }

		      	{/*<div id='restaurants'>
			      	{this.state.restaurantInfo.length ? (
			        	<Searched>
			          	{this.state.restaurantInfo.map(restaurant => (
				            <Searcheditems key={restaurant._id} showDetails={(ev) => this.showDetails(ev)}
				            	value={restaurant._id}
				            >              
											<p> Name of Restaurant: {restaurant.name} </p>
											<p> Address: {restaurant.location.address}, {restaurant.location.city}, {restaurant.location.state} </p>
											<p> Data Summary: 
												<ul>
													<li>Yelp Rating: {restaurant.rating[0].rating} </li>
													<li>Yelp URL: <a href={restaurant.yelpURL} target='blank'>{restaurant.name}</a></li>
												</ul>
											</p>
				            </Searcheditems>
				          	))}
			       		</Searched>
						) : (
						<h3>No Results to Display</h3>
						)}
			    </div>*/}
				</div>
			
		</div>
	)
};
}

export default findRestaurant;