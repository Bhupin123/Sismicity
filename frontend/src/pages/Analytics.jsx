import React, { useEffect, useState, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { earthquakeService } from '../services/api'
import { useFilters } from '../hooks'
import { Panel, KpiCard } from '../components/UI'
import { SeismoAreaChart, SeismoBarChart, SeismoDonutChart } from '../components/Charts'
import FilterBar from '../components/FilterBar'

// ══════════════════════════════════════════════════════════════════
//  SUB-REGIONS DATA  (states / provinces / regions per country)
// ══════════════════════════════════════════════════════════════════
const SUB_REGIONS = {
  'United States': [
    { name: 'Alabama',        bbox: [-88.5,30.1,-84.9,35.0] },
    { name: 'Alaska',         bbox: [-168.0,54.5,-130.0,71.5] },
    { name: 'Arizona',        bbox: [-114.8,31.3,-109.0,37.0] },
    { name: 'Arkansas',       bbox: [-94.6,33.0,-89.6,36.5] },
    { name: 'California',     bbox: [-124.4,32.5,-114.1,42.0] },
    { name: 'Colorado',       bbox: [-109.1,36.9,-102.0,41.0] },
    { name: 'Connecticut',    bbox: [-73.7,41.0,-71.8,42.1] },
    { name: 'Florida',        bbox: [-87.6,24.5,-80.0,31.0] },
    { name: 'Georgia',        bbox: [-85.6,30.4,-81.0,35.0] },
    { name: 'Hawaii',         bbox: [-160.2,18.9,-154.8,22.2] },
    { name: 'Idaho',          bbox: [-117.2,42.0,-111.0,49.0] },
    { name: 'Illinois',       bbox: [-91.5,36.97,-87.5,42.5] },
    { name: 'Indiana',        bbox: [-88.1,37.8,-84.8,41.8] },
    { name: 'Iowa',           bbox: [-96.6,40.4,-90.1,43.5] },
    { name: 'Kansas',         bbox: [-102.1,37.0,-94.6,40.0] },
    { name: 'Kentucky',       bbox: [-89.6,36.5,-81.9,39.1] },
    { name: 'Louisiana',      bbox: [-94.0,28.9,-88.8,33.0] },
    { name: 'Maine',          bbox: [-71.1,43.1,-67.0,47.5] },
    { name: 'Maryland',       bbox: [-79.5,37.9,-75.0,39.7] },
    { name: 'Massachusetts',  bbox: [-73.5,41.2,-69.9,42.9] },
    { name: 'Michigan',       bbox: [-90.4,41.7,-82.4,48.3] },
    { name: 'Minnesota',      bbox: [-97.2,43.5,-89.5,49.4] },
    { name: 'Mississippi',    bbox: [-91.7,30.2,-88.1,35.0] },
    { name: 'Missouri',       bbox: [-95.8,36.0,-89.1,40.6] },
    { name: 'Montana',        bbox: [-116.0,44.4,-104.0,49.0] },
    { name: 'Nebraska',       bbox: [-104.1,40.0,-95.3,43.0] },
    { name: 'Nevada',         bbox: [-120.0,35.0,-114.0,42.0] },
    { name: 'New Hampshire',  bbox: [-72.6,42.7,-70.7,45.3] },
    { name: 'New Jersey',     bbox: [-75.6,38.9,-73.9,41.4] },
    { name: 'New Mexico',     bbox: [-109.1,31.3,-103.0,37.0] },
    { name: 'New York',       bbox: [-79.8,40.5,-71.9,45.0] },
    { name: 'North Carolina', bbox: [-84.3,33.8,-75.5,36.6] },
    { name: 'North Dakota',   bbox: [-104.1,45.9,-96.6,49.0] },
    { name: 'Ohio',           bbox: [-84.8,38.4,-80.5,42.3] },
    { name: 'Oklahoma',       bbox: [-103.0,33.6,-94.4,37.0] },
    { name: 'Oregon',         bbox: [-124.6,42.0,-116.5,46.3] },
    { name: 'Pennsylvania',   bbox: [-80.5,39.7,-74.7,42.3] },
    { name: 'Rhode Island',   bbox: [-71.9,41.1,-71.1,42.0] },
    { name: 'South Carolina', bbox: [-83.4,32.0,-78.5,35.2] },
    { name: 'South Dakota',   bbox: [-104.1,42.5,-96.4,45.9] },
    { name: 'Tennessee',      bbox: [-90.3,35.0,-81.6,36.7] },
    { name: 'Texas',          bbox: [-106.6,25.8,-93.5,36.5] },
    { name: 'Utah',           bbox: [-114.1,37.0,-109.0,42.0] },
    { name: 'Vermont',        bbox: [-73.4,42.7,-71.5,45.0] },
    { name: 'Virginia',       bbox: [-83.7,36.5,-75.2,39.5] },
    { name: 'Washington',     bbox: [-124.8,45.5,-116.9,49.0] },
    { name: 'West Virginia',  bbox: [-82.6,37.2,-77.7,40.6] },
    { name: 'Wisconsin',      bbox: [-92.9,42.5,-86.2,47.1] },
    { name: 'Wyoming',        bbox: [-111.1,41.0,-104.0,45.0] },
  ],
  'India': [
    { name: 'Andhra Pradesh',      bbox: [76.8,12.6,84.8,19.9] },
    { name: 'Arunachal Pradesh',   bbox: [91.5,26.6,97.4,29.5] },
    { name: 'Assam',               bbox: [89.7,24.1,96.0,28.2] },
    { name: 'Bihar',               bbox: [83.3,24.3,88.3,27.5] },
    { name: 'Gujarat',             bbox: [68.2,20.1,74.5,24.7] },
    { name: 'Himachal Pradesh',    bbox: [75.6,30.4,79.0,33.2] },
    { name: 'Jammu & Kashmir',     bbox: [73.7,32.3,80.3,37.1] },
    { name: 'Karnataka',           bbox: [74.0,11.6,78.6,18.5] },
    { name: 'Kerala',              bbox: [74.9,8.2,77.4,12.8] },
    { name: 'Madhya Pradesh',      bbox: [74.0,21.1,82.8,26.9] },
    { name: 'Maharashtra',         bbox: [72.6,15.6,80.9,22.0] },
    { name: 'Manipur',             bbox: [93.0,23.8,94.8,25.7] },
    { name: 'Meghalaya',           bbox: [89.8,25.0,92.8,26.1] },
    { name: 'Mizoram',             bbox: [92.2,21.9,93.4,24.5] },
    { name: 'Nagaland',            bbox: [93.3,25.2,95.3,27.0] },
    { name: 'Odisha',              bbox: [81.4,17.8,87.5,22.6] },
    { name: 'Punjab',              bbox: [73.9,29.5,76.9,32.5] },
    { name: 'Rajasthan',           bbox: [69.5,23.0,78.3,30.2] },
    { name: 'Sikkim',              bbox: [88.0,27.1,88.9,28.1] },
    { name: 'Tamil Nadu',          bbox: [76.2,8.0,80.3,13.6] },
    { name: 'Telangana',           bbox: [77.2,15.8,81.3,19.9] },
    { name: 'Tripura',             bbox: [91.2,22.9,92.3,24.5] },
    { name: 'Uttar Pradesh',       bbox: [77.1,23.9,84.6,30.4] },
    { name: 'Uttarakhand',         bbox: [77.6,28.7,81.1,31.5] },
    { name: 'West Bengal',         bbox: [85.8,21.6,89.9,27.2] },
  ],
  'China': [
    { name: 'Anhui',        bbox: [114.9,29.4,119.6,34.6] },
    { name: 'Beijing',      bbox: [115.4,39.4,117.5,41.1] },
    { name: 'Chongqing',    bbox: [105.3,28.2,110.2,32.2] },
    { name: 'Fujian',       bbox: [115.8,23.5,120.7,28.3] },
    { name: 'Gansu',        bbox: [92.3,32.6,108.7,42.8] },
    { name: 'Guangdong',    bbox: [109.7,20.2,117.3,25.5] },
    { name: 'Guangxi',      bbox: [104.5,20.9,112.0,26.4] },
    { name: 'Guizhou',      bbox: [103.6,24.6,109.6,29.2] },
    { name: 'Hainan',       bbox: [108.6,18.2,111.0,20.1] },
    { name: 'Hebei',        bbox: [113.5,36.1,119.8,42.6] },
    { name: 'Heilongjiang', bbox: [121.2,43.4,135.1,53.6] },
    { name: 'Henan',        bbox: [110.4,31.4,116.6,36.4] },
    { name: 'Hubei',        bbox: [108.4,29.0,116.1,33.3] },
    { name: 'Hunan',        bbox: [108.8,24.6,114.3,30.1] },
    { name: 'Inner Mongolia', bbox: [97.2,37.4,126.1,53.3] },
    { name: 'Jiangsu',      bbox: [116.4,30.8,121.9,35.1] },
    { name: 'Jiangxi',      bbox: [113.6,24.5,118.5,30.1] },
    { name: 'Jilin',        bbox: [121.6,41.6,131.3,44.1] },
    { name: 'Liaoning',     bbox: [118.8,38.7,125.8,43.5] },
    { name: 'Ningxia',      bbox: [104.3,35.2,107.7,39.4] },
    { name: 'Qinghai',      bbox: [89.4,31.6,103.1,39.2] },
    { name: 'Shaanxi',      bbox: [105.5,31.7,111.2,39.6] },
    { name: 'Shandong',     bbox: [114.8,34.4,122.7,38.4] },
    { name: 'Shanghai',     bbox: [120.9,30.7,122.1,31.9] },
    { name: 'Shanxi',       bbox: [110.2,34.6,114.6,40.7] },
    { name: 'Sichuan',      bbox: [97.4,26.0,108.5,34.3] },
    { name: 'Tianjin',      bbox: [116.7,38.6,118.1,40.2] },
    { name: 'Tibet',        bbox: [78.4,26.8,99.1,36.5] },
    { name: 'Xinjiang',     bbox: [73.5,34.3,96.4,49.2] },
    { name: 'Yunnan',       bbox: [97.5,21.1,106.2,29.2] },
    { name: 'Zhejiang',     bbox: [118.0,27.1,122.9,31.2] },
  ],
  'Australia': [
    { name: 'New South Wales',      bbox: [140.9,-37.6,153.6,-28.2] },
    { name: 'Victoria',             bbox: [140.9,-39.2,149.9,-34.0] },
    { name: 'Queensland',           bbox: [138.0,-29.2,153.5,-10.7] },
    { name: 'South Australia',      bbox: [129.0,-38.1,141.0,-26.0] },
    { name: 'Western Australia',    bbox: [112.9,-35.1,129.0,-14.0] },
    { name: 'Tasmania',             bbox: [143.8,-43.6,148.5,-40.6] },
    { name: 'Northern Territory',   bbox: [129.0,-26.0,138.0,-11.0] },
    { name: 'ACT',                  bbox: [148.8,-35.9,149.4,-35.1] },
  ],
  'Canada': [
    { name: 'Alberta',              bbox: [-120.0,49.0,-110.0,60.0] },
    { name: 'British Columbia',     bbox: [-139.1,48.3,-114.0,60.0] },
    { name: 'Manitoba',             bbox: [-102.1,49.0,-89.0,60.0] },
    { name: 'New Brunswick',        bbox: [-67.9,44.6,-63.8,48.1] },
    { name: 'Newfoundland',         bbox: [-67.8,46.6,-52.6,60.4] },
    { name: 'Nova Scotia',          bbox: [-66.4,43.4,-59.7,47.0] },
    { name: 'Ontario',              bbox: [-95.2,41.7,-74.3,56.9] },
    { name: 'Prince Edward Island', bbox: [-64.4,46.0,-62.0,47.1] },
    { name: 'Quebec',               bbox: [-79.8,44.9,-57.1,62.6] },
    { name: 'Saskatchewan',         bbox: [-110.0,49.0,-101.4,60.0] },
    { name: 'Northwest Territories',bbox: [-136.5,60.0,-102.0,78.0] },
    { name: 'Nunavut',              bbox: [-120.0,60.0,-61.0,83.1] },
    { name: 'Yukon',                bbox: [-141.0,59.3,-124.0,69.7] },
  ],
  'Russia': [
    { name: 'Kamchatka',            bbox: [155.9,50.8,163.3,60.9] },
    { name: 'Sakhalin',             bbox: [141.7,45.9,144.1,54.4] },
    { name: 'Siberia (West)',        bbox: [60.0,50.0,90.0,72.0] },
    { name: 'Siberia (East)',        bbox: [90.0,50.0,140.0,72.0] },
    { name: 'Ural Region',          bbox: [55.0,51.0,65.0,68.0] },
    { name: 'Caucasus Region',      bbox: [39.0,41.0,49.0,44.0] },
    { name: 'Far East',             bbox: [130.0,42.0,145.0,55.0] },
    { name: 'Moscow Region',        bbox: [35.0,54.0,40.0,57.0] },
  ],
  'Indonesia': [
    { name: 'Sumatra',              bbox: [95.0,-5.9,108.9,5.5] },
    { name: 'Java',                 bbox: [105.2,-8.8,114.4,-5.9] },
    { name: 'Borneo (Kalimantan)', bbox: [108.0,-4.2,118.0,4.2] },
    { name: 'Sulawesi',             bbox: [119.3,-5.7,125.3,1.7] },
    { name: 'Maluku',               bbox: [124.0,-7.0,135.0,0.7] },
    { name: 'Papua',                bbox: [131.0,-9.0,141.0,0.0] },
    { name: 'Bali',                 bbox: [114.4,-8.9,115.7,-8.1] },
    { name: 'Nusa Tenggara',        bbox: [115.5,-10.9,125.2,-8.2] },
  ],
  'Japan': [
    { name: 'Hokkaido',             bbox: [139.3,41.3,145.8,45.5] },
    { name: 'Honshu',               bbox: [129.5,33.0,141.9,41.6] },
    { name: 'Kyushu',               bbox: [129.6,31.0,131.9,33.9] },
    { name: 'Shikoku',              bbox: [132.0,32.9,134.8,34.3] },
    { name: 'Ryukyu Islands',       bbox: [122.9,24.0,131.4,30.0] },
  ],
  'Mexico': [
    { name: 'Baja California',      bbox: [-117.1,28.0,-109.4,32.7] },
    { name: 'Chiapas',              bbox: [-92.2,14.5,-90.4,17.8] },
    { name: 'Chihuahua',            bbox: [-109.1,26.0,-103.3,31.8] },
    { name: 'Guerrero',             bbox: [-102.2,16.3,-98.0,18.9] },
    { name: 'Jalisco',              bbox: [-105.8,19.0,-101.5,22.8] },
    { name: 'Mexico City',          bbox: [-99.4,19.1,-98.9,19.6] },
    { name: 'Michoacan',            bbox: [-103.5,17.9,-100.0,20.4] },
    { name: 'Oaxaca',               bbox: [-98.6,15.6,-93.9,18.7] },
    { name: 'Puebla',               bbox: [-99.1,17.8,-96.7,20.8] },
    { name: 'Veracruz',             bbox: [-97.8,17.2,-93.6,22.4] },
  ],
  'Turkey': [
    { name: 'Aegean Region',        bbox: [26.0,36.5,30.0,39.5] },
    { name: 'Central Anatolia',     bbox: [30.0,37.0,36.0,41.0] },
    { name: 'Eastern Anatolia',     bbox: [36.0,37.0,44.8,40.0] },
    { name: 'Marmara Region',       bbox: [26.0,39.5,31.0,42.0] },
    { name: 'Mediterranean Coast',  bbox: [29.0,36.0,36.5,37.5] },
    { name: 'Southeastern Anatolia',bbox: [36.0,36.5,42.0,38.5] },
  ],
  'Iran': [
    { name: 'Alborz Province',      bbox: [50.4,35.5,52.8,36.8] },
    { name: 'Fars Province',        bbox: [51.2,27.5,55.6,31.6] },
    { name: 'Isfahan Province',     bbox: [49.2,30.7,55.6,34.4] },
    { name: 'Kerman Province',      bbox: [54.5,26.5,59.0,32.0] },
    { name: 'Khorasan',             bbox: [56.4,31.5,61.3,37.8] },
    { name: 'Khuzestan',            bbox: [47.7,29.9,50.6,33.0] },
    { name: 'Mazandaran',           bbox: [50.7,35.7,54.0,37.0] },
    { name: 'Tehran Province',      bbox: [50.2,35.1,52.8,36.4] },
    { name: 'West Azerbaijan',      bbox: [44.0,36.5,47.5,39.5] },
    { name: 'Zagros Region',        bbox: [45.0,29.0,52.0,35.0] },
  ],
  'Chile': [
    { name: 'Antofagasta Region',   bbox: [-70.6,-26.4,-66.1,-21.8] },
    { name: 'Araucania Region',     bbox: [-72.8,-39.6,-70.8,-37.6] },
    { name: 'Atacama Region',       bbox: [-71.7,-29.0,-68.2,-25.4] },
    { name: 'Biobio Region',        bbox: [-73.6,-38.5,-71.3,-36.9] },
    { name: 'Coquimbo Region',      bbox: [-71.7,-32.3,-69.8,-29.0] },
    { name: 'Los Lagos Region',     bbox: [-75.6,-44.0,-71.7,-40.3] },
    { name: 'Maule Region',         bbox: [-73.2,-36.9,-70.4,-35.0] },
    { name: 'Metropolitana',        bbox: [-71.7,-34.3,-69.8,-33.0] },
    { name: 'Tarapaca Region',      bbox: [-70.5,-21.8,-67.9,-17.5] },
    { name: 'Valparaiso Region',    bbox: [-71.8,-33.7,-70.0,-32.0] },
  ],
  'Greece': [
    { name: 'Attica',               bbox: [23.3,37.7,24.2,38.3] },
    { name: 'Central Greece',       bbox: [21.5,38.5,24.0,39.5] },
    { name: 'Crete',                bbox: [23.5,34.8,26.4,35.7] },
    { name: 'Ionian Islands',       bbox: [20.1,37.5,23.0,39.8] },
    { name: 'North Aegean',         bbox: [25.5,37.5,27.0,40.0] },
    { name: 'Northern Greece',      bbox: [20.5,40.0,26.6,41.7] },
    { name: 'Peloponnese',          bbox: [21.0,36.5,23.5,38.0] },
    { name: 'South Aegean',         bbox: [24.5,36.0,28.0,37.8] },
    { name: 'Thessaly',             bbox: [21.5,39.0,23.0,40.0] },
  ],
  'Philippines': [
    { name: 'Luzon',                bbox: [116.9,12.5,126.6,20.9] },
    { name: 'Mindanao',             bbox: [120.9,5.1,126.6,10.1] },
    { name: 'Mindoro',              bbox: [120.6,12.3,121.5,13.3] },
    { name: 'Palawan',              bbox: [117.2,8.0,119.8,12.0] },
    { name: 'Panay',                bbox: [121.9,10.7,123.0,11.7] },
    { name: 'Samar',                bbox: [124.7,11.1,125.8,12.6] },
    { name: 'Visayas',              bbox: [121.9,9.3,125.8,12.0] },
  ],
  'New Zealand': [
    { name: 'North Island',         bbox: [172.0,-41.7,178.6,-34.4] },
    { name: 'South Island',         bbox: [166.4,-46.6,174.4,-40.5] },
    { name: 'Canterbury',           bbox: [169.8,-44.8,172.8,-42.5] },
    { name: 'Marlborough',          bbox: [172.8,-42.0,174.4,-41.0] },
    { name: 'Waikato',              bbox: [174.6,-38.5,176.4,-37.2] },
    { name: 'Wellington',           bbox: [174.6,-41.7,176.2,-40.6] },
  ],
  'Peru': [
    { name: 'Ancash',               bbox: [-78.5,-10.4,-76.7,-8.0] },
    { name: 'Arequipa',             bbox: [-75.1,-16.6,-70.3,-14.4] },
    { name: 'Ayacucho',             bbox: [-75.5,-15.0,-73.3,-12.7] },
    { name: 'Cusco',                bbox: [-73.8,-15.4,-70.3,-12.4] },
    { name: 'Ica',                  bbox: [-76.4,-15.7,-74.7,-13.0] },
    { name: 'La Libertad',          bbox: [-79.7,-8.6,-76.5,-6.7] },
    { name: 'Lima',                 bbox: [-77.7,-12.7,-76.2,-11.4] },
    { name: 'Loreto',               bbox: [-75.6,-4.0,-70.0,-0.0] },
    { name: 'Puno',                 bbox: [-70.5,-17.3,-68.7,-13.7] },
    { name: 'Tacna',                bbox: [-70.7,-18.4,-69.5,-16.7] },
  ],
}

// ══════════════════════════════════════════════════════════════════
//  COUNTRY + BOUNDING BOX DATA
// ══════════════════════════════════════════════════════════════════
const COUNTRIES = [
  { name: 'Afghanistan',          bbox: [60.5,29.4,74.9,38.5] },
  { name: 'Albania',              bbox: [19.3,39.6,21.1,42.7] },
  { name: 'Algeria',              bbox: [-8.7,18.9,12.0,37.1] },
  { name: 'Argentina',            bbox: [-73.6,-55.1,-53.6,-21.8] },
  { name: 'Armenia',              bbox: [43.4,38.8,46.6,41.3] },
  { name: 'Australia',            bbox: [112.9,-43.7,153.6,-10.7] },
  { name: 'Azerbaijan',           bbox: [44.8,38.4,50.4,41.9] },
  { name: 'Bangladesh',           bbox: [88.0,20.7,92.7,26.6] },
  { name: 'Bolivia',              bbox: [-69.7,-22.9,-57.5,-9.7] },
  { name: 'Brazil',               bbox: [-73.9,-33.8,-28.8,5.3] },
  { name: 'Cambodia',             bbox: [102.3,10.4,107.6,14.7] },
  { name: 'Canada',               bbox: [-141.0,41.7,-52.6,83.1] },
  { name: 'Chile',                bbox: [-75.6,-55.9,-66.1,-17.5] },
  { name: 'China',                bbox: [73.5,18.2,134.8,53.6] },
  { name: 'Colombia',             bbox: [-79.0,-4.2,-66.9,12.5] },
  { name: 'Costa Rica',           bbox: [-85.9,8.0,-82.6,11.2] },
  { name: 'Croatia',              bbox: [13.5,42.4,19.4,46.5] },
  { name: 'Ecuador',              bbox: [-80.9,-5.0,-75.2,1.4] },
  { name: 'Egypt',                bbox: [24.7,22.0,37.1,31.7] },
  { name: 'El Salvador',          bbox: [-90.1,13.1,-87.7,14.4] },
  { name: 'Ethiopia',             bbox: [33.0,3.4,47.9,14.9] },
  { name: 'Fiji',                 bbox: [177.0,-19.2,-178.0,-15.7] },
  { name: 'France',               bbox: [-5.1,42.3,8.2,51.1] },
  { name: 'Georgia',              bbox: [40.0,41.1,46.7,43.6] },
  { name: 'Greece',               bbox: [20.1,34.8,26.6,41.7] },
  { name: 'Guatemala',            bbox: [-92.2,13.7,-88.2,17.8] },
  { name: 'Honduras',             bbox: [-89.4,13.0,-83.2,16.5] },
  { name: 'India',                bbox: [68.1,8.4,97.4,37.1] },
  { name: 'Indonesia',            bbox: [95.0,-11.0,141.0,6.1] },
  { name: 'Iran',                 bbox: [44.0,25.1,63.3,39.8] },
  { name: 'Iraq',                 bbox: [38.8,29.1,48.6,37.4] },
  { name: 'Italy',                bbox: [6.6,36.5,18.5,47.1] },
  { name: 'Jamaica',              bbox: [-78.3,17.7,-76.2,18.5] },
  { name: 'Japan',                bbox: [129.5,31.0,145.8,45.5] },
  { name: 'Jordan',               bbox: [34.9,29.2,39.3,33.4] },
  { name: 'Kazakhstan',           bbox: [50.3,40.6,87.4,55.4] },
  { name: 'Kenya',                bbox: [33.9,-4.7,42.0,5.0] },
  { name: 'Kyrgyzstan',           bbox: [69.3,39.2,80.3,43.2] },
  { name: 'Laos',                 bbox: [100.1,13.9,107.7,22.5] },
  { name: 'Lebanon',              bbox: [35.1,33.1,36.6,34.7] },
  { name: 'Libya',                bbox: [9.4,19.5,25.1,33.2] },
  { name: 'Madagascar',           bbox: [43.2,-25.6,50.5,-12.0] },
  { name: 'Malaysia',             bbox: [99.6,0.9,119.3,7.4] },
  { name: 'Mexico',               bbox: [-117.1,14.5,-86.7,32.7] },
  { name: 'Mongolia',             bbox: [87.7,41.6,119.9,52.1] },
  { name: 'Morocco',              bbox: [-13.2,27.7,-1.0,35.9] },
  { name: 'Mozambique',           bbox: [30.2,-26.9,40.8,-10.5] },
  { name: 'Myanmar',              bbox: [92.2,9.8,101.2,28.5] },
  { name: 'Nepal',                bbox: [80.1,26.4,88.2,30.4] },
  { name: 'New Zealand',          bbox: [166.4,-46.6,178.6,-34.4] },
  { name: 'Nicaragua',            bbox: [-87.7,10.7,-83.1,15.0] },
  { name: 'Nigeria',              bbox: [2.7,4.3,14.7,13.9] },
  { name: 'North Korea',          bbox: [124.3,37.7,130.7,42.9] },
  { name: 'Norway',               bbox: [4.5,57.9,31.1,71.2] },
  { name: 'Pakistan',             bbox: [60.9,23.7,77.8,37.1] },
  { name: 'Panama',               bbox: [-83.0,7.2,-77.2,9.6] },
  { name: 'Papua New Guinea',     bbox: [141.0,-11.6,156.0,-1.3] },
  { name: 'Peru',                 bbox: [-81.3,-18.4,-68.7,-0.0] },
  { name: 'Philippines',          bbox: [116.9,4.6,126.6,20.9] },
  { name: 'Portugal',             bbox: [-9.5,36.8,-6.2,42.1] },
  { name: 'Romania',              bbox: [20.3,43.6,29.7,48.3] },
  { name: 'Russia',               bbox: [19.6,41.2,190.0,81.9] },
  { name: 'Saudi Arabia',         bbox: [36.5,16.4,55.7,32.2] },
  { name: 'Solomon Islands',      bbox: [155.5,-11.8,166.9,-5.1] },
  { name: 'South Korea',          bbox: [126.1,34.3,129.6,38.6] },
  { name: 'Spain',                bbox: [-9.3,36.0,4.3,43.8] },
  { name: 'Sudan',                bbox: [21.8,8.7,38.6,22.2] },
  { name: 'Tajikistan',           bbox: [67.3,36.7,75.2,41.0] },
  { name: 'Tanzania',             bbox: [29.3,-11.7,40.4,-1.0] },
  { name: 'Thailand',             bbox: [97.3,5.6,105.6,20.5] },
  { name: 'Tonga',                bbox: [-175.7,-21.5,-173.7,-15.6] },
  { name: 'Tunisia',              bbox: [8.2,30.2,11.6,37.5] },
  { name: 'Turkey',               bbox: [25.7,35.8,44.8,42.1] },
  { name: 'Turkmenistan',         bbox: [52.4,35.1,66.7,42.8] },
  { name: 'Uganda',               bbox: [29.6,-1.5,35.0,4.2] },
  { name: 'Ukraine',              bbox: [22.1,44.4,40.2,52.4] },
  { name: 'United States',        bbox: [-124.8,24.4,-66.9,49.4] },
  { name: 'Uzbekistan',           bbox: [56.0,37.2,73.2,45.6] },
  { name: 'Vanuatu',              bbox: [166.5,-20.2,170.2,-13.1] },
  { name: 'Venezuela',            bbox: [-73.3,0.6,-59.8,12.2] },
  { name: 'Vietnam',              bbox: [102.1,8.4,109.5,23.4] },
  { name: 'Yemen',                bbox: [42.5,12.1,54.5,19.0] },
  { name: 'Zimbabwe',             bbox: [25.2,-22.4,33.1,-15.6] },
].map(c => ({ ...c, hasSubRegions: !!SUB_REGIONS[c.name] }))

// ══════════════════════════════════════════════════════════════════
//  USGS FETCH
// ══════════════════════════════════════════════════════════════════
async function fetchUSGS({ bbox, starttime, endtime, minmagnitude = 0 }) {
  const [minlon, minlat, maxlon, maxlat] = bbox
  const url = new URL('https://earthquake.usgs.gov/fdsnws/event/1/query')
  url.searchParams.set('format',       'geojson')
  url.searchParams.set('starttime',    starttime)
  url.searchParams.set('endtime',      endtime)
  url.searchParams.set('minlatitude',  minlat)
  url.searchParams.set('maxlatitude',  maxlat)
  url.searchParams.set('minlongitude', minlon)
  url.searchParams.set('maxlongitude', maxlon)
  url.searchParams.set('minmagnitude', minmagnitude)
  url.searchParams.set('orderby',      'time')
  url.searchParams.set('limit',        '20000')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`USGS error ${res.status}`)
  const json = await res.json()
  return json.features || []
}

// ══════════════════════════════════════════════════════════════════
//  TRANSFORM RAW USGS FEATURES
// ══════════════════════════════════════════════════════════════════
function transformFeatures(features) {
  if (!features.length) return null

  const mags   = features.map(f => f.properties.mag).filter(m => m != null)
  const depths = features.map(f => f.geometry.coordinates[2]).filter(d => d != null)
  const times  = features.map(f => f.properties.time)
  const major  = mags.filter(m => m >= 5.5).length
  const moderate = mags.filter(m => m >= 4 && m < 5.5).length
  const minor  = mags.filter(m => m < 4).length

  const monthMap = {}
  features.forEach(f => {
    const d = new Date(f.properties.time)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    if (!monthMap[key]) monthMap[key] = { period: key, count: 0, mag_sum: 0, max_mag: 0 }
    monthMap[key].count++
    monthMap[key].mag_sum += (f.properties.mag || 0)
    if ((f.properties.mag || 0) > monthMap[key].max_mag) monthMap[key].max_mag = f.properties.mag
  })
  const monthly = Object.values(monthMap)
    .sort((a,b) => a.period.localeCompare(b.period))
    .map(r => ({ ...r, avg_mag: r.count ? +(r.mag_sum / r.count).toFixed(2) : 0 }))

  const yearMap = {}
  features.forEach(f => {
    const key = String(new Date(f.properties.time).getFullYear())
    if (!yearMap[key]) yearMap[key] = { period: key, count: 0, mag_sum: 0, max_mag: 0 }
    yearMap[key].count++
    yearMap[key].mag_sum += (f.properties.mag || 0)
    if ((f.properties.mag || 0) > yearMap[key].max_mag) yearMap[key].max_mag = f.properties.mag
  })
  const yearly = Object.values(yearMap)
    .sort((a,b) => a.period.localeCompare(b.period))
    .map(r => ({ ...r, avg_mag: r.count ? +(r.mag_sum / r.count).toFixed(2) : 0 }))

  const avg_mag   = mags.length ? +(mags.reduce((a,b)=>a+b,0) / mags.length).toFixed(2) : 0
  const max_mag   = mags.length ? +Math.max(...mags).toFixed(1) : 0
  const min_mag   = mags.length ? +Math.min(...mags).toFixed(1) : 0
  const avg_depth = depths.length ? +(depths.reduce((a,b)=>a+b,0) / depths.length).toFixed(1) : 0
  const date_earliest = times.length ? new Date(Math.min(...times)).toISOString().slice(0,10) : ''
  const date_latest   = times.length ? new Date(Math.max(...times)).toISOString().slice(0,10) : ''

  return {
    stats: { total: features.length, avg_mag, max_mag, min_mag, avg_depth, major_count: major, moderate_count: moderate, minor_count: minor, date_earliest, date_latest },
    monthly,
    yearly,
  }
}

// ══════════════════════════════════════════════════════════════════
//  SEARCHABLE DROPDOWN  — fixed-position portal, never disrupts layout
// ══════════════════════════════════════════════════════════════════
function SearchDropdown({ options, value, onChange, placeholder, showSubRegionBadge }) {
  const [query, setQuery]         = useState('')
  const [open,  setOpen]          = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const triggerRef                = useRef()
  const dropdownRef               = useRef()

  // Recompute dropdown position whenever it opens
  const updatePos = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setDropdownPos({
      top:   rect.bottom + window.scrollY + 2,
      left:  rect.left   + window.scrollX,
      width: rect.width,
    })
  }, [])

  useEffect(() => {
    if (open) updatePos()
  }, [open, updatePos])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = e => {
      if (
        triggerRef.current  && !triggerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close + reposition on scroll / resize
  useEffect(() => {
    if (!open) return
    const onScroll = () => updatePos()
    const onResize = () => updatePos()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, updatePos])

  const filtered = options.filter(o => o.name.toLowerCase().includes(query.toLowerCase()))

  const select = opt => { onChange(opt); setQuery(''); setOpen(false) }
  const clear  = e   => { e.stopPropagation(); onChange(null); setQuery('') }

  const dropdownPanel = open && ReactDOM.createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top:    dropdownPos.top,
        left:   dropdownPos.left,
        width:  dropdownPos.width,
        zIndex: 99999,
        background: 'rgba(6, 14, 28, 0.99)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(0, 200, 255, 0.5)',
        borderTop: '1px solid rgba(0, 200, 255, 0.2)',
        borderRadius: '0 0 10px 10px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,200,255,0.06)',
      }}
    >
      {/* Search input */}
      <div style={{ padding: '10px 10px 6px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ position: 'relative' }}>
          <svg
            style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}
            width="12" height="12" viewBox="0 0 12 12" fill="none"
          >
            <circle cx="5" cy="5" r="4" stroke="white" strokeWidth="1.5"/>
            <path d="M8.5 8.5L11 11" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search..."
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', padding: '7px 10px 7px 28px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6, color: '#fff',
              fontSize: 12, outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(0,200,255,0.5)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
        </div>
      </div>

      {/* Options list */}
      <div style={{ overflowY: 'auto', maxHeight: 260 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '16px', color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center' }}>
            No results found
          </div>
        ) : (
          filtered.map(opt => {
            const isSelected = value?.name === opt.name
            return (
              <div
                key={opt.name}
                onClick={() => select(opt)}
                style={{
                  padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                  color: isSelected ? '#00c8ff' : 'rgba(255,255,255,0.85)',
                  background: isSelected ? 'rgba(0,200,255,0.1)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderLeft: isSelected ? '2px solid #00c8ff' : '2px solid transparent',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'rgba(0,200,255,0.07)'
                    e.currentTarget.style.color = '#fff'
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'rgba(255,255,255,0.85)'
                  }
                }}
              >
                <span>{opt.name}</span>
                {showSubRegionBadge && opt.hasSubRegions && (
                  <span style={{
                    fontSize: 9, color: 'rgba(0,200,255,0.7)',
                    background: 'rgba(0,200,255,0.1)',
                    border: '1px solid rgba(0,200,255,0.2)',
                    borderRadius: 4, padding: '2px 7px', fontWeight: 700,
                    letterSpacing: '0.4px', textTransform: 'uppercase',
                  }}>
                    regions
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer count */}
      <div style={{
        padding: '5px 14px', borderTop: '1px solid rgba(255,255,255,0.05)',
        fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'right',
      }}>
        {filtered.length} of {options.length}
      </div>
    </div>,
    document.body
  )

  return (
    <div style={{ position: 'relative', minWidth: 230 }}>
      {/* Trigger button */}
      <div
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 14px',
          background: open
            ? 'rgba(10, 22, 40, 0.97)'
            : 'rgba(10, 22, 40, 0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: open
            ? '1px solid rgba(0, 200, 255, 0.6)'
            : '1px solid rgba(0, 200, 255, 0.25)',
          // Keep square bottom corners when open so it merges visually with the portal panel
          borderRadius: open ? '8px 8px 0 0' : 8,
          cursor: 'pointer',
          color: value ? 'var(--txt1)' : 'var(--txt3)',
          fontSize: 13,
          userSelect: 'none',
          gap: 8,
          boxShadow: open
            ? '0 0 0 3px rgba(0,200,255,0.12), 0 4px 20px rgba(0,0,0,0.5)'
            : '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontWeight: value ? 500 : 400,
        }}>
          {value ? value.name : placeholder}
        </span>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          {value && (
            <span
              onClick={clear}
              style={{
                color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 1,
                padding: '2px 5px', borderRadius: 4,
                background: 'rgba(255,255,255,0.08)',
                transition: 'all 0.15s', cursor: 'pointer',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#ff3d3d'
                e.currentTarget.style.background = 'rgba(255,61,61,0.15)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
              }}
            >
              ×
            </span>
          )}
          <span style={{
            color: open ? '#00c8ff' : 'var(--txt3)',
            transition: 'transform 0.2s, color 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            display: 'inline-block',
          }}>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </div>
      </div>

      {/* Portal-rendered dropdown — lives in <body>, never disrupts flex layout */}
      {dropdownPanel}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
//  DATE RANGE PRESETS
// ══════════════════════════════════════════════════════════════════
const PRESETS = [
  { label: '7 days',  days: 7   },
  { label: '30 days', days: 30  },
  { label: '90 days', days: 90  },
  { label: '1 year',  days: 365 },
  { label: '5 years', days: 1825 },
  { label: 'Custom',  days: null },
]

function dateNDaysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
function today() { return new Date().toISOString().slice(0, 10) }

// ══════════════════════════════════════════════════════════════════
//  MAIN COMPONENT  (unchanged from original except SearchDropdown swap)
// ══════════════════════════════════════════════════════════════════
export default function Analytics() {
  const { params } = useFilters()

  // DB-mode state
  const [dbStats,   setDbStats]   = useState(null)
  const [dbMonthly, setDbMonthly] = useState([])
  const [dbYearly,  setDbYearly]  = useState([])
  const [dbLoading, setDbLoading] = useState(true)

  // USGS-mode state
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [selectedRegion,  setSelectedRegion]  = useState(null)
  const [preset,          setPreset]          = useState(PRESETS[2])
  const [customStart,     setCustomStart]     = useState(dateNDaysAgo(90))
  const [customEnd,       setCustomEnd]       = useState(today())
  const [minMag,          setMinMag]          = useState(0)
  const [usgsData,        setUsgsData]        = useState(null)
  const [usgsLoading,     setUsgsLoading]     = useState(false)
  const [usgsError,       setUsgsError]       = useState(null)

  const mode        = selectedCountry ? 'usgs' : 'db'
  const subRegions  = selectedCountry ? (SUB_REGIONS[selectedCountry.name] || []) : []
  const hasRegions  = subRegions.length > 0

  // DB fetch
  useEffect(() => {
    if (mode !== 'db') return
    setDbLoading(true)
    Promise.all([
      earthquakeService.getStats(params),
      earthquakeService.getTimeline({ ...params, group_by: 'month' }),
      earthquakeService.getTimeline({ group_by: 'year' }),
    ]).then(([s, m, y]) => {
      setDbStats(s)
      setDbMonthly(m || [])
      setDbYearly(y  || [])
      setDbLoading(false)
    })
  }, [JSON.stringify(params), mode])

  // USGS fetch
  const fetchCountryData = useCallback(async () => {
    if (!selectedCountry) return
    setUsgsLoading(true)
    setUsgsError(null)
    setUsgsData(null)

    const bbox  = selectedRegion ? selectedRegion.bbox : selectedCountry.bbox
    const start = preset.days ? dateNDaysAgo(preset.days) : customStart
    const end   = preset.days ? today() : customEnd

    try {
      const features = await fetchUSGS({ bbox, starttime: start, endtime: end, minmagnitude: minMag })
      setUsgsData(transformFeatures(features))
    } catch (err) {
      setUsgsError(err.message || 'Failed to fetch USGS data')
    } finally {
      setUsgsLoading(false)
    }
  }, [selectedCountry, selectedRegion, preset, customStart, customEnd, minMag])

  useEffect(() => {
    if (selectedCountry) fetchCountryData()
  }, [selectedCountry, selectedRegion, preset, customStart, customEnd, minMag])

  useEffect(() => { setSelectedRegion(null) }, [selectedCountry])

  const stats   = mode === 'usgs' ? usgsData?.stats   : dbStats
  const monthly = mode === 'usgs' ? usgsData?.monthly : dbMonthly
  const yearly  = mode === 'usgs' ? usgsData?.yearly  : dbYearly
  const loading = mode === 'usgs' ? usgsLoading        : dbLoading

  const donut = stats ? [
    { label: 'Minor (<M4)',       value: stats.minor_count,    color: '#00e676' },
    { label: 'Moderate (M4-5.5)', value: stats.moderate_count, color: '#ff9f1c' },
    { label: 'Major (>=M5.5)',    value: stats.major_count,    color: '#ff3d3d' },
  ] : []

  const tableRows = stats ? [
    ['Total Events',    stats.total?.toLocaleString()],
    ['Avg Magnitude',   `M ${stats.avg_mag}`],
    ['Max Magnitude',   `M ${stats.max_mag}`],
    ['Min Magnitude',   `M ${stats.min_mag}`],
    ['Avg Depth',       `${stats.avg_depth} km`],
    ['Major Events',    `${stats.major_count?.toLocaleString()} (>=M5.5)`],
    ['Moderate Events', `${stats.moderate_count?.toLocaleString()} (M4-5.5)`],
    ['Minor Events',    `${stats.minor_count?.toLocaleString()} (<M4)`],
    ['Date From',       stats.date_earliest],
    ['Date To',         stats.date_latest],
  ] : []

  const inputStyle = {
    padding: '7px 10px',
    background: 'rgba(10,22,40,0.9)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(0,200,255,0.25)',
    borderRadius: 6,
    color: 'var(--txt1)',
    fontSize: 12,
    outline: 'none',
  }

  const labelStyle = {
    fontSize: 10,
    color: 'rgba(0,200,255,0.7)',
    marginBottom: 5,
    fontWeight: 700,
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
  }

  return (
    <>
      {/* ── TOP CONTROLS ── */}
      <div style={{
        background: 'rgba(8, 18, 34, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(0,200,255,0.15)',
        borderRadius: 14,
        padding: '18px 20px',
        marginBottom: 16,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        alignItems: 'flex-end',
        // IMPORTANT: overflow must NOT be hidden — the portal is in <body> so this is fine,
        // but we set position so the trigger's getBoundingClientRect() is correct.
        position: 'relative',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}>

        {/* Country */}
        <div>
          <div style={labelStyle}>Country / Region</div>
          <SearchDropdown
            options={COUNTRIES}
            value={selectedCountry}
            onChange={setSelectedCountry}
            placeholder="All countries (DB mode)"
            showSubRegionBadge
          />
        </div>

        {/* Sub-region */}
        {selectedCountry && hasRegions && (
          <div>
            <div style={labelStyle}>
              {selectedCountry.name === 'United States' ? 'State' : 'Region / Province'}
            </div>
            <SearchDropdown
              options={subRegions}
              value={selectedRegion}
              onChange={setSelectedRegion}
              placeholder={`All of ${selectedCountry.name}`}
            />
          </div>
        )}

        {/* Time preset */}
        {selectedCountry && (
          <div>
            <div style={labelStyle}>Time Range</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => setPreset(p)}
                  style={{
                    padding: '7px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600,
                    background: preset.label === p.label
                      ? 'rgba(0,200,255,0.2)'
                      : 'rgba(255,255,255,0.05)',
                    color: preset.label === p.label ? '#00c8ff' : 'rgba(255,255,255,0.5)',
                    border: preset.label === p.label
                      ? '1px solid rgba(0,200,255,0.5)'
                      : '1px solid rgba(255,255,255,0.08)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (preset.label !== p.label) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                      e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (preset.label !== p.label) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                      e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
                    }
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom date range */}
        {selectedCountry && preset.days === null && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div>
              <div style={labelStyle}>From</div>
              <input type="date" value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>To</div>
              <input type="date" value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                style={inputStyle} />
            </div>
          </div>
        )}

        {/* Min magnitude */}
        {selectedCountry && (
          <div>
            <div style={labelStyle}>
              Min Magnitude&nbsp;
              <span style={{ color: '#fff', fontWeight: 700 }}>M{minMag.toFixed(1)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>0</span>
              <input
                type="range" min={0} max={8} step={0.5} value={minMag}
                onChange={e => setMinMag(parseFloat(e.target.value))}
                style={{ width: 110, accentColor: '#00c8ff', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>8</span>
            </div>
          </div>
        )}

        {/* Mode badge */}
        <div style={{ marginLeft: 'auto', alignSelf: 'center' }}>
          <span style={{
            padding: '7px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: mode === 'usgs' ? 'rgba(0,200,255,0.12)' : 'rgba(0,230,118,0.12)',
            color: mode === 'usgs' ? '#00c8ff' : '#00e676',
            border: `1px solid ${mode === 'usgs' ? 'rgba(0,200,255,0.35)' : 'rgba(0,230,118,0.35)'}`,
            letterSpacing: '0.6px',
            backdropFilter: 'blur(8px)',
          }}>
            {mode === 'usgs' ? 'USGS LIVE' : 'DATABASE'}
          </span>
        </div>
      </div>

      {/* DB mode: show FilterBar */}
      {mode === 'db' && <FilterBar />}

      {/* Page title */}
      {selectedCountry && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ margin: 0, color: 'var(--txt1)', fontSize: 18, fontWeight: 700 }}>
            {selectedRegion
              ? `${selectedRegion.name}, ${selectedCountry.name}`
              : selectedCountry.name}
          </h2>
          {!usgsLoading && usgsData && (
            <span style={{ color: 'var(--txt3)', fontSize: 13 }}>
              — {usgsData.stats.total.toLocaleString()} events via USGS
            </span>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="spinner" />
          <p style={{ color: 'var(--txt3)', marginTop: 16, fontSize: 14 }}>
            {mode === 'usgs' ? `Fetching USGS data for ${selectedCountry?.name}...` : 'Loading...'}
          </p>
        </div>
      )}

      {/* Error */}
      {usgsError && !usgsLoading && (
        <div style={{
          background: 'rgba(255,61,61,0.08)',
          border: '1px solid rgba(255,61,61,0.3)',
          borderRadius: 10, padding: '20px 24px', marginBottom: 16,
          color: '#ff3d3d', fontSize: 14, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div>
            <strong>USGS fetch failed</strong>
            <br />
            <span style={{ fontSize: 12, opacity: 0.8 }}>{usgsError}</span>
            <br />
            <button onClick={fetchCountryData} style={{
              marginTop: 8, padding: '5px 14px',
              background: 'rgba(255,61,61,0.15)',
              border: '1px solid rgba(255,61,61,0.4)',
              borderRadius: 6, color: '#ff3d3d',
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
            }}>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* No data USGS */}
      {!loading && !usgsError && mode === 'usgs' && usgsData && usgsData.stats.total === 0 && (
        <div className="empty-state">
          <div className="empty-icon" />
          <p>No earthquakes found for <strong>{selectedCountry?.name}</strong> in the selected time range and magnitude threshold.</p>
          <p style={{ fontSize: 12, opacity: 0.7 }}>Try expanding the time range or lowering the minimum magnitude.</p>
        </div>
      )}

      {/* No data DB */}
      {!loading && mode === 'db' && !dbStats && (
        <div className="empty-state"><div className="empty-icon" /><p>No data</p></div>
      )}

      {/* Charts */}
      {!loading && stats && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Total Events"   value={stats.total?.toLocaleString()}        accent="plasma" />
            <KpiCard label="Major Events"   value={stats.major_count?.toLocaleString()}  accent="hot"    />
            <KpiCard label="Avg Magnitude"  value={`M ${stats.avg_mag}`} />
            <KpiCard label="Peak Magnitude" value={`M ${stats.max_mag}`}                 accent="warn"   />
            <KpiCard label="Avg Depth"      value={`${stats.avg_depth} km`} />
          </div>

          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="panel-header">
              <span className="panel-title">Monthly Frequency</span>
              <span className="panel-badge">EVENTS PER MONTH</span>
            </div>
            <div className="panel-body">
              <SeismoAreaChart data={monthly} dataKey="count" height={240} />
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: 16 }}>
            <Panel title="Yearly Trend" badge="ANNUAL COUNT">
              <SeismoBarChart data={yearly} dataKey="count" xKey="period"
                color="#00c8ff" height={220} />
            </Panel>
            <Panel title="Magnitude Distribution">
              <SeismoDonutChart slices={donut} height={220} />
            </Panel>
          </div>

          {mode === 'usgs' && monthly.length > 0 && (
            <div className="panel" style={{ marginBottom: 16 }}>
              <div className="panel-header">
                <span className="panel-title">Average Magnitude Over Time</span>
                <span className="panel-badge">MONTHLY AVG</span>
              </div>
              <div className="panel-body">
                <SeismoAreaChart data={monthly} dataKey="avg_mag" height={200} color="#ff9f1c" />
              </div>
            </div>
          )}

          <Panel title="Full Statistics Summary" badge="AGGREGATE DATA">
            <table className="data-table">
              <tbody>
                {tableRows.map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ color: 'var(--txt2)', width: '40%' }}>{k}</td>
                    <td className="mono" style={{ fontWeight: 600 }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </>
      )}
    </>
  )
}