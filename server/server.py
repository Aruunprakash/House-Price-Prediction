from flask import Flask, request, jsonify
import util
app = Flask(__name__)

util.load_saved_artifacts()
@app.route('./get_location_names',methods=['POST'])
def get_location_names():
    print("DEBUG locations:", locations, type(locations))
    response = jsonify({
        'locations':util.get_location_names()
    })
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

@app.route('/get_estimated_price', methods=['POST'])
def get_price():
    total_sqft = float(request.json['total_sqft'])
    location = request.json['location']
    bhk = int(request.json['bhk'])
    bath = int(request.json['bath'])

    response = jsonify({
        'estimated_price':util.get_estimated_price(location,total_sqft,bhk,bath)
    })
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response


if __name__ == '__main__':
    print("starting py flask server for home price prediction")
    app.run(port=5000)
