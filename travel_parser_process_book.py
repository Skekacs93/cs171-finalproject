# -*- coding: utf-8 -*-
import xml.etree.ElementTree as ET
from us import get_congress_from_date
from app.person.models import Person, PersonRole, Party, Ethnicity, Religion
from app.travel.models import * 
from dateutil.parser import parse
import datetime
from django.core.exceptions import ObjectDoesNotExist, MultipleObjectsReturned
from unidecode import unidecode
import re
from app.person.types import *
import urllib2
import json
from common import enum
import time
import csv

l3 = []

def create_sponsor_mappings():
	f = open(settings.DATA_PATH + "travel/travel_sponsors.csv", 'rU')
	reader = csv.reader(f)
	d = {}
	for row in reader:
	    arr = []
	    arr.append(row[1])
	    if row[2] != '':
	        arr.append(row[2])
	    if row[3] != '':
	        arr.append(row[3])
	    d[row[0]] = arr
	return d

def is_ascii(string):
    try:
        string.decode('ascii')
        return True
    except UnicodeDecodeError:
        return False
    except UnicodeEncodeError:
        return False

def parse_sponsor(name, mappings):
	name = name.replace('\n', ' ').strip()
	if name in mappings:
		return mappings[name]
	else:
		print "Sponsor: " + name
		l3.append(name)
		return name

def process_name(name, nonaccent_to_accent, full_name):
	if 'Gonzalez' in full_name and 'Charles' in full_name:
		return 'Gonzalez'
	else:
		if name in nonaccent_to_accent:
			return nonaccent_to_accent[name]
		else:
			return name


def process_country_name(name):
	country_dict = {'U.S. Virgin Islands': 'United States Virgin Islands', 'Macedonia (FYROM)': 'Macedonia', 'The Bahamas':'Bahamas', 'Republic of the Union of Myanmar': 'Myanmar'}
	if name in country_dict:
		return country_dict[name]
	else:
		return name

def process_initial_destination(name):
	country_dict = {'Wye River Conference Center': 'Queenstown, Maryland', 'Sahrawi refugee camps': 'Algeria', 'Antigua, West Indies': 'Antigua', 'Wanapum Dam near Vantage': 'Vantage, Washington', 'Kichwa Tempo': 'Kenya', 'Kichwa Tembo Air Strip -': 'Kenya', 'Barona, Tanzania': 'Tanzania', 'Kichwa, Tanzania': 'Tanzania', 'Kichwa Tembo Air Strip': 'Kenya', 'Bono Luka, Bosnia-': 'Bosnia', 'Dar as Salaam, Tanzania  Nairo': 'Dar es Salaam, Tanzania', 'Metoulah-': 'Metula, Israel', 'Schloss Elmau, Bavaria;': 'Bavaria', 'Polisario Refugee Camps, South': 'Algeria', 'LA Selva Biological Field Stat': 'Costa Rica', 'La Selva Biological Field Stat': 'Costa Rica', 'Goma, Democratic Republic of t': 'Democratic Republic of the Congo', 'Kinshasha, Democratic Republic': 'Kinshasa, Democratic Republic of the Congo', 'Calebra, Nigeria': 'Nigeria', 'Dollo Ado Airfield, Ethiopia': 'Ethiopia', 'Inga Dam, Democratic Republic': 'Democratic Republic of the Congo', 'Goma, Democratic Republic of C': 'Democratic Republic of the Congo'}
	if name in country_dict:
		return country_dict[name]
	else:
		return name

def parse_house_person(name, state, district, departure_date, nonaccent_to_accent):
	global i
	#role_type = 2 means they are a representative
	datetime_obj = parse(departure_date)
	date_obj = datetime.date(datetime_obj.year, datetime_obj.month, datetime_obj.day)
	try:
		congress = get_congress_from_date(date_obj)
	except ValueError:
		congress = get_congress_from_date(date_obj, range_type = 'start')
	name_arr = name.split(',')
	fname = name_arr[1].split()[0]
	lname = process_name(name_arr[0], nonaccent_to_accent, name)
	try:
		personrole_obj = PersonRole.objects.get(congresses = congress, role_type = 2, person__lastname__iexact = lname, person__firstname__iexact = fname)
	except ObjectDoesNotExist:
		try:
			personrole_obj = PersonRole.objects.get(congresses = congress, role_type = 2, person__lastname__iexact = lname)
		except ObjectDoesNotExist:
			try:
				personrole_obj = PersonRole.objects.get(congresses = congress - 1, role_type = 2, person__lastname__iexact = lname)
			except ObjectDoesNotExist:
				print "third time doesn't exist"
				print fname + ' ' + lname + ' ' + str(congress)
		except MultipleObjectsReturned:
			personrole_obj = PersonRole.objects.get(congresses = congress, role_type = 2, person__lastname__iexact = lname, state = state, district = district)
	except MultipleObjectsReturned:
		personrole_obj = PersonRole.objects.filter(congresses = congress, role_type = 2, person__lastname__iexact = lname, person__firstname__iexact = fname)[0]
	return personrole_obj

def parse_house(nonaccent_to_accent, sponsor_mappings):
	for year in range(2007,2015):
		fname = str(year) + "Travel.xml"
		root = ET.parse(settings.DATA_PATH + 'travel/house/' + fname)
		for travel in root.findall('Travel'):
			person_name = travel.find('MemberName').text
			person_state = travel.find('State').text
			person_district = travel.find('District').text
			departure_date = travel.find('DepartureDate').text
			#sometimes they have staffer travel, in this case state and district are none
			if person_state != None and person_district != None:
				personrole = parse_house_person(person_name, person_state, person_district, departure_date, nonaccent_to_accent)
				person = personrole.person

				departure_date = parse(travel.find('DepartureDate').text)
				return_date = parse(travel.find('ReturnDate').text)
				destination = process_initial_destination(travel.find('Destination').text)

				destination_obj, created = TravelDestination.objects.get_or_create(destination_name = destination)
				if created or destination_obj.destination_country == None:
					g_key = 'AIzaSyCfPg6GAIeEKHM-Qs9y4HOuqWibHhD3iYs'
					query = urllib2.quote(destination)
					url = 'https://maps.googleapis.com/maps/api/geocode/json?address=%s&key=%s' % (query, g_key)
					page = urllib2.urlopen(url)
					data = page.read()
					data = json.loads(data)
					if data['status'] == 'OK':
						g_obj = data['results'][0]
						destination_obj.destination_cleaned_name = g_obj['formatted_address']
						for component in g_obj["address_components"]:
							if "country" in component["types"]:
								try:
									destination_obj.destination_country = Country.by_label(process_country_name(component["long_name"]))
								except enum.NotFound:
									destination_obj.destination_country = None
									print component["long_name"]
						if destination_obj.destination_country == Country.UnitedStates:
							for component in g_obj["address_components"]:
								if "administrative_area_level_1" in component["types"]:
									try:
										destination_obj.destination_state = component["short_name"]
									except enum.NotFound:
										destination_obj.destination_state = None
										print component["short_name"]
						destination_obj.destination_latitude = g_obj["geometry"]["location"]["lat"]
						destination_obj.destination_longitude = g_obj["geometry"]["location"]["lng"]
					else:
						print "Nothing found: " + destination
						print data
						destination_obj.destination_cleaned_name = None

				trip, created = Travel.objects.get_or_create(destination = destination_obj, member = person, memberrole = personrole, departure_date = departure_date, return_date = return_date)
				sponsor_text = travel.find('TravelSponsor').text
				sponsor_array = parse_sponsor(sponsor_text, sponsor_mappings)
				trip.sponsor.clear()
				for sponsor in sponsor_array:
					sponsor, created = TravelSponsor.objects.get_or_create(name = sponsor)
					trip.sponsor.add(sponsor)
				trip.save()
				sponsor.save()
				destination_obj.save()

def parse_person_travel_geography(personrole_list):
	personrole_list = personrole_list
	state_to_fips = {u'WA': u'53', u'VA': u'51', u'DE': u'10', u'DC': u'11', u'WI': u'55', u'WV': u'54', u'HI': u'15', u'FL': u'12', u'WY': u'56', u'NH': u'33', u'NJ': u'34', u'NM': u'35', u'TX': u'48', u'LA': u'22', u'NC': u'37', u'ND': u'38', u'NE': u'31', u'TN': u'47', u'NY': u'36', u'PA': u'42', u'CA': u'06', u'NV': u'32', u'PR': u'72', u'GU': u'66', u'CO': u'08', u'VI': u'78', u'AK': u'02', u'AL': u'01', u'AS': u'60', u'AR': u'05', u'VT': u'50', u'IL': u'17', u'GA': u'13', u'IN': u'18', u'IA': u'19', u'OK': u'40', u'AZ': u'04', u'ID': u'16', u'CT': u'09', u'ME': u'23', u'MD': u'24', u'MA': u'25', u'OH': u'39', u'UT': u'49', u'MO': u'29', u'MN': u'27', u'MI': u'26', u'RI': u'44', u'KS': u'20', u'MT': u'30', u'MS': u'28', u'SC': u'45', u'KY': u'21', u'OR': u'41', u'SD': u'46', 'MP':'100'}
	# fp = open(settings.DATA_PATH + 'travel/zips_districts.txt')
	# zips_districts = fp.read()
	# arr1 = zips_districts.split()
	# d = {}
	# for i in arr1:
	# 	arr2 = i.split(',')
	# 	d[(int(arr2[0]),int(arr2[2]))] = arr2[1]
	# print d
	fips_district_to_zip = {(55, 5): '53549', (42, 10): '18854', (6, 28): '91608', (19, 4): '56027', (40, 3): '79051', (47, 9): '38157', (21, 6): '41360', (8, 5): '81253', (32, 2): '89883', (36, 8): '11235', (34, 8): '07524', (37, 13): '27616', (12, 17): '33324', (36, 22): '14892', (39, 11): '44146', (26, 12): '48312', (48, 17): '77879', (27, 1): '56266', (4, 5): '85331', (55, 2): '53969', (6, 23): '93458', (17, 13): '60565', (6, 41): '92583', (45, 2): '29945', (34, 3): '08758', (12, 8): '34788', (36, 29): '14905', (13, 13): '30349', (13, 14): 'Ringgold', (48, 8): '77876', (27, 6): '56387', (51, 5): '24599', (28, 1): '39776', (5, 1): '72687', (29, 4): '65787', (53, 7): '98199', (6, 14): '95130', (17, 6): '60563', (41, 1): '97396', (18, 5): '47384', (42, 6): '19611', (6, 32): '91803', (40, 1): '74467', (22, 7): '71362', (46, 0): '69337', (47, 5): '37228', (35, 3): '88437', (12, 7): '32792', (36, 4): '11801', (13, 6): '30534', (24, 2): '21286', (48, 15): '78596', (51, 10): '22663', (25, 3): '02790', (6, 1): '95776', (42, 1): '19153', (6, 27): '91606', (19, 1): '52807', (17, 17): '62707', (47, 2): '37938', (48, 32): '75252', (36, 3): '11804', (37, 2): '28478', (48, 6): '77871', (12, 20): '33394', (25, 4): '02790', (39, 12): '43356', (26, 3): '49548', (48, 28): '78670', (53, 9): '98597', (55, 7): '54984', (42, 8): '19440', (6, 18): '95388', (17, 10): '60201', (20, 1): '67954', (42, 18): '15697', (6, 52): '92131', (21, 4): '41472', (8, 7): '80701', (33, 1): '03897', (36, 10): '11239', (34, 6): '08904', (37, 11): '28909', (38, 0): '59221', (12, 19): '33498', (36, 16): '10474', (39, 5): '45899', (26, 10): '48767', (48, 19): '79748', (27, 3): '55448', (4, 7): '85746', (28, 4): '39581', (29, 9): '65591', (16, 2): '83716', (6, 21): '93727', (17, 3): '60804', (18, 8): '47993', (6, 47): '92868', (22, 2): '70163', (34, 1): '08312', (12, 10): '34698', (39, 2): '45697', (13, 11): '30753', (48, 10): '78954', (51, 7): '23832', (28, 3): '39772', (29, 2): '63390', (53, 5): '99403', (6, 12): '94404', (17, 4): '60804', (18, 3): '46982', (42, 4): '16229', (6, 38): '91792', (22, 5): '71749', (47, 7): '42223', (12, 1): '32583', (36, 6): '11693', (13, 4): '30360', (37, 7): '28574', (24, 4): '21771', (48, 1): '75980', (51, 9): '37642', (1, 6): '36793', (25, 1): '01585', (39, 17): '44720', (26, 6): '49450', (6, 7): '95688', (30, 0): '59937', (55, 8): '54983', (42, 15): '19539', (6, 25): '96133', (19, 3): '52595', (20, 4): '67570', (6, 51): '92283', (8, 2): '81657', (9, 3): '06770', (36, 13): '11228', (34, 13): '10004', (12, 22): '33487', (25, 10): '02713', (39, 14): '44491', (26, 1): '49971', (48, 30): '75270', (11, 98): '20375', (31, 2): '68164', (55, 1): '53585', (6, 16): '95148', (17, 8): '60195', (20, 3): '66227', (42, 16): '19611', (6, 42): '92887', (21, 2): '42788', (45, 5): '29745', (9, 4): '06907', (34, 4): '08759', (37, 9): '28278', (12, 13): '34293', (36, 18): '10994', (39, 7): '45732', (26, 8): '49285', (48, 21): '78885', (27, 5): '55455', (4, 1): '87328', (5, 4): '72958', (29, 7): '65810', (6, 11): '95690', (17, 1): '60827', (18, 6): '47448', (6, 45): '92596', (12, 4): '32697', (36, 25): '14625', (13, 9): '30757', (48, 12): '76490', (1, 3): '36879', (4, 8): '85750', (53, 3): '98686', (6, 2): '96134', (41, 5): '97498', (18, 1): '47995', (42, 2): '19150', (6, 36): '90813', (23, 2): '04988', (47, 1): '37891', (12, 3): '34761', (13, 2): '31907', (37, 5): '28698', (24, 6): '21798', (48, 3): '75454', (12, 25): '34142', (1, 4): '36272', (25, 7): '02493', (49, 2): '86514', (26, 4): '49738', (48, 25): '78963', (6, 5): '95864', (54, 3): '26691', (42, 13): '19525', (6, 31): '91206', (19, 5): '56129', (6, 49): '92883', (8, 4): '82063', (32, 1): '89156', (9, 1): '06790', (36, 15): '11370', (34, 11): '08876', (12, 16): '34997', (36, 21): '13459', (25, 8): '02215', (39, 8): '45885', (26, 15): '49276', (50, 0): '05907', (48, 16): '79938', (4, 4): '85353', (55, 3): '54773', (6, 22): '93561', (40, 4): '74878', (17, 14): '61443', (44, 2): '02921', (6, 40): '92886', (45, 3): '29860', (34, 2): '08406', (12, 15): '34972', (36, 28): '14626', (15, 2): '96863', (39, 1): '45252', (48, 23): '79938', (27, 7): '56763', (51, 2): '23669', (4, 3): '85382', (5, 2): '72860', (29, 5): '64701', (6, 9): '94710', (17, 7): '60804', (41, 2): '99362', (18, 4): '47995', (6, 35): '90504', (22, 6): '70836', (12, 6): '34748', (36, 27): '14787', (13, 7): '30680', (24, 1): '21930', (48, 14): '78382', (1, 1): '36784', (53, 1): '98392', (6, 26): '92407', (6, 8): '94134', (17, 18): '62707', (47, 3): '37931', (36, 2): '11804', (37, 3): '28594', (24, 8): '20912', (48, 5): '75976', (25, 5): '01886', (39, 13): '44720', (51, 11): '22312', (26, 2): '49689', (48, 27): '78598', (54, 1): '26855', (31, 1): '68792', (55, 4): '53235', (42, 11): '18709', (6, 29): '91803', (17, 11): '61774', (47, 8): '38392', (21, 5): '42653', (8, 6): '80835', (32, 3): '89191', (56, 0): '83128', (33, 2): '03812', (36, 9): '11697', (34, 9): '07666', (37, 12): '28278', (12, 18): '33190', (36, 23): '13697', (39, 10): '44146', (26, 13): '48238', (48, 18): '77547', (4, 6): '85296', (16, 1): '99128', (6, 20): '93728', (17, 12): '62999', (6, 46): '92844', (45, 1): '29585', (12, 9): '34695', (39, 3): '45697', (13, 12): '31419', (48, 9): '77489', (51, 4): '23966', (28, 2): '39767', (29, 3): '63673', (53, 6): '98595', (6, 15): '95134', (17, 5): '60707', (18, 2): '47997', (42, 7): '19468', (6, 33): '90292', (22, 4): '71749', (23, 1): '04989', (47, 4): '38589', (35, 2): '88435', (36, 5): '11596', (13, 5): '30354', (24, 3): '21405', (1, 7): '36925', (25, 2): '02019', (6, 6): '95497', (42, 14): '15238', (6, 24): '93463', (17, 16): '61285', (6, 50): '92130', (8, 1): '80294', (36, 12): '11421', (34, 12): '08902', (37, 1): '28586', (48, 7): '77449', (12, 21): '33332', (51, 8): '22315', (39, 15): '45369', (48, 29): '77587', (53, 8): '98446', (31, 3): '82082', (55, 6): '54986', (42, 9): '17853', (6, 19): '95389', (17, 9): '60714', (20, 2): '67447', (42, 19): '17407', (6, 53): '92154', (21, 3): '40299', (45, 6): '29945', (9, 5): '06812', (36, 11): '11238', (34, 7): '08889', (37, 10): '28777', (12, 12): '34759', (36, 17): '10994', (15, 1): '96826', (39, 4): '45897', (26, 11): '48442', (48, 20): '78254', (27, 2): '56096', (51, 1): '23696', (29, 8): '72644', (6, 10): '95758', (17, 2): '60827', (18, 9): '47637', (6, 44): '92883', (22, 3): '70778', (12, 11): '34250', (36, 24): '14886', (13, 10): '31061', (48, 11): '79789', (51, 6): '24595', (29, 1): '63147', (53, 4): '99357', (6, 13): '94621', (42, 5): '17841', (6, 39): '90808', (47, 6): '38589', (12, 2): '32692', (36, 7): '11378', (13, 3): '31909', (37, 6): '28394', (24, 5): '21140', (48, 2): '77713', (12, 24): '32953', (1, 5): '38852', (49, 3): '84766', (39, 16): '44903', (26, 7): '49289', (48, 24): '76262', (6, 4): '97635', (54, 2): '26886', (42, 12): '16668', (6, 30): '91367', (19, 2): '52778', (6, 48): '92869', (8, 3): '81656', (9, 2): '06498', (36, 14): '11377', (34, 10): '07305', (12, 23): '34987', (36, 20): '13859', (25, 9): '02494', (39, 9): '44889', (26, 14): '48240', (48, 31): '78947', (6, 17): '95076', (17, 15): '62984', (44, 1): '02917', (42, 17): '19606', (6, 43): '92411', (21, 1): '42761', (45, 4): '29690', (10, 0): '19980', (34, 5): '08886', (37, 8): '28396', (12, 14): '34224', (36, 19): '12780', (39, 6): '45789', (26, 9): '48390', (48, 22): '77598', (27, 4): '55432', (51, 3): '23899', (4, 2): '89024', (5, 3): '72959', (29, 6): '65354', (40, 2): '74966', (40, 5): '74884', (41, 3): '97267', (18, 7): '46278', (6, 34): '90706', (22, 1): '70471', (35, 1): '88321', (12, 5): '34797', (36, 26): '14846', (13, 8): '31798', (48, 13): '79601', (1, 2): '36860', (53, 2): '98297', (6, 3): '96120', (41, 4): '97731', (42, 3): '16511', (6, 37): '90815', (17, 19): '62995', (36, 1): '11980', (13, 1): '31798', (37, 4): '27713', (24, 7): '21797', (48, 4): '76273', (25, 6): '01985', (49, 1): '84628', (39, 18): '45782', (2, 0): '99950', (26, 5): '48768', (48, 26): '76273', (27, 8): '56688', (60,0): 'American+Samoa', (100,0): 'Northern+Mariana+Islands', (48, 36): 'Chester', (66,0): 'Guam', (66,34): 'Beeville', (49,4):'Salt Lake City', (11,0): 'Washington', (4,9): 'Tempe', (72,0): 'Puerto Rico', (78,0): 'Virgin Islands' }
	for role in personrole_list:
		if role.travelviz_latitude == None:
			try:
				state_code = int(state_to_fips[role.state])
			except KeyError:
				print "State Error: " + role.state
				break
			district = int(role.district)
			try:
				zip_code = fips_district_to_zip[(state_code,district)]
			except KeyError:
				print "Error: " + role.person.name + str(role.state) + str(role.district)
			query = str(zip_code) + ',' + role.state
			g_key = 'AIzaSyCfPg6GAIeEKHM-Qs9y4HOuqWibHhD3iYs'
			url = 'https://maps.googleapis.com/maps/api/geocode/json?address=%s&key=%s' % (query, g_key)
			time.sleep(4)
			page = urllib2.urlopen(url)
			data = page.read()
			data = json.loads(data)
			if data['status'] == 'OK':
				g_obj = data['results'][0]
				#print role
				role.travelviz_latitude = g_obj["geometry"]["location"]["lat"]
				role.travelviz_longitude = g_obj["geometry"]["location"]["lng"]
				role.save()
				#print role
			else:
				print "Nothing found: " + query

def main(options):
	if options["force"]:
		metadata = True
		if metadata:
			sponsors = list(set(list(TravelSponsor.objects.all().values_list('name', flat=True))))
			countries = list(set(list(TravelDestination.objects.all().values_list('destination_country', flat=True))))
			countries = [a for a in countries if a != None]
			countries_final = []
			for country in countries:
				countries_final.append(Country.by_value(country).label)
			states = list(set(list(TravelDestination.objects.all().values_list('destination_state', flat=True))))
			states = [a for a in states if a != None]
			states_final = []
			for state in states:
				states_final.append((state, State.by_value(state).label))
			people = []
			travels = Travel.objects.all()
			for travel in travels:
				if travel.destination.destination_country != None:
					travel_object_dict = {}
					member = travel.member
					if member.current:
						role = member.current_role
					else:
						role = member.most_recent_role
					if role.role_type == 1:
						title = "Sen. "
					elif role.role_type == 2:
						title = "Rep. "
					party = str(Party.by_value(travel.memberrole.party).key)
					position = '(' + party[0] + '-' + role.state
					if role.role_type == 2:
						position += str(role.district)
					position += ')'
					name = title + member.fullname + ' ' + position
					people.append(name)
			people = list(set(people))
			d = {'people': people, 'countries': countries_final, 'states': states_final, 'sponsors': sponsors}
			f = open("metadata.json", 'w')
			json.dump(d,f)
			
		else:
			travels = Travel.objects.all()
			travel_dict = []
			for travel in travels:
				if travel.destination.destination_country != None:
					travel_object_dict = {}
					member = travel.member
					if member.current:
						role = member.current_role
					else:
						role = member.most_recent_role
					if role.role_type == 1:
						title = "Sen. "
					elif role.role_type == 2:
						title = "Rep. "
					party = str(Party.by_value(travel.memberrole.party).key)
					position = '(' + party[0] + '-' + role.state
					if role.role_type == 2:
						position += str(role.district)
					position += ')'
					name = title + member.fullname + ' ' + position
					travel_object_dict['person'] = name
					travel_object_dict['departure_date'] = str(travel.departure_date)
					travel_object_dict['return_date'] = str(travel.return_date)
					travel_object_dict['destination'] = travel.destination.destination_cleaned_name
					travel_object_dict['sponsor'] = json.dumps(list(travel.sponsor.all().values_list('name', flat=True)))
					travel_object_dict['committees'] = json.dumps(list(travel.member.committeeassignments.all().filter(committee__committee = None).values_list('committee__name', flat = True)))
					travel_object_dict['departure_latitude'] = str(travel.memberrole.travelviz_latitude)
					travel_object_dict['departure_longitude'] = str(travel.memberrole.travelviz_longitude)
					travel_object_dict['destination_latitude'] = str(travel.destination.destination_latitude)
					travel_object_dict['destination_longitude'] = str(travel.destination.destination_longitude)
					travel_object_dict['destination_country'] = Country.by_value(travel.destination.destination_country).label
					if travel.destination.destination_state == None:
						travel_object_dict['destination_state'] = None
					else:
						travel_object_dict['destination_state'] = State.by_value(travel.destination.destination_state).label
					travel_object_dict['party'] = party[0]
					travel_object_dict['state'] = travel.memberrole.state
					travel_object_dict['district'] = str(travel.memberrole.district)
					if travel.member.ethnicity == None:
						travel_object_dict['ethnicity'] = None
					else:
						travel_object_dict['ethnicity'] = Ethnicity.by_value(travel.member.ethnicity).label
					if travel.member.religion == None:
						travel_object_dict['religion'] = None
					else:
						travel_object_dict['religion'] = Religion.by_value(travel.member.religion).label
					travel_object_dict['title'] = travel.memberrole.leadership_title
					travel_dict.append(travel_object_dict)
			f = open("travel.json", 'w')
			json.dump(travel_dict, f)
	else:
		sponsor_mappings = create_sponsor_mappings()
		names = Person.objects.all().values_list('lastname', flat = True)
		accent_to_nonaccent = {name: unidecode(name) for name in names if not is_ascii(name)}
		nonaccent_to_accent = {value: key for key, value in accent_to_nonaccent.iteritems()}
		parse_house(nonaccent_to_accent, sponsor_mappings)
		# print l3
		# print list(set(l3))
		# print len(list(set(l3)))
		person_list = Travel.objects.all().values_list('memberrole__id', flat = True)
		person_list = PersonRole.objects.filter(id__in = person_list)
		parse_person_travel_geography(person_list)

