# Tidal Dashboard
SignalK node server plugin that reads tidal data from the internet and displays it in a web app. Data is downloaded when on shore and processed while under sail. For waterlevel at the ship's position, a weighed average is calculated based on the distance to adjacent tidal stations.
![image](https://user-images.githubusercontent.com/17980560/160613564-0c407c91-811e-4ed5-894a-d54799019a9a.png)
Notes
- Tidal stations provided are from https://waterinfo.rws.nl/?#!/kaart/waterhoogte/; under Details, Export, CSV you will find the URLs to add new tidal stations in the SignalK plugin configuration.
- Make sure to have the system time set to the right timezone.
- For now, the webapp needs a GPS (navigation.position) provider to refresh the screen.
