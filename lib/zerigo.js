var   _         = require("underscore")
	, http 		= require("http")
	, fs 		= require("fs")
	, path		= require("path")
	, xml2js	= require('xml2js')
	, xmlParser = new xml2js.Parser();

exports = module.exports = Zerigo;

	function Zerigo(auth,zone,options){
		this.auth  = auth;
		this.zone  = zone;
		this.options = options;
		return this;
	}

Zerigo.prototype.updateDNSList = function(callback){
	var self = this;

	if(!_.isFunction(callback))
		callback = function(){};

	this.zerigoAPI("read",function(err,result){		
		xmlParser.parseString(result, function (err1, result1) {
			var arr = [];
			_.each(result1.hosts.host,function(v1,k1){
				_.each(v1,function(v,k){
					v1[k] = v[0];
					if(_.isObject(v1[k]))
						v1[k] = v[0]._;
				});
				arr.push(v1);
			})
			fs.writeFile(path.join(__dirname,self.zone+".json"), JSON.stringify(arr), function (err) {
				if (err) throw err;
					callback(result1);
			});
		});
  })
}


Zerigo.prototype.updateDNSHost = function(host, ip, callback){
	var self = this;

	if(!_.isFunction(callback))
		callback = function(){};

	if(!_.isString(ip))
		ip = this.options.ip;
	
	if(_.isString(host)){
		var request = "<host><data>"+ip+"</data><host-type>A</host-type><hostname>"+host+"</hostname></host>"
		self.findDNSRecord("A","hostname",host,function(data){
			if(data.length == 0)
				console.log("doesnt exists",host,ip)
			else
				self.zerigoAPI("update",{id:data[0].id, body:request},function(err,result){
					console.log("updated host ",host,ip,result);
				 	self.updateDNSList(callback);
				});
		});
	}
	else 
		console.log("missing host");


}

Zerigo.prototype.createDNSHost = function(host, ip, callback){
	var self = this;

	if(!_.isFunction(callback))
		callback = function(){};

	if(!_.isString(ip))
		ip = this.options.ip;
	
	if(_.isString(host)){
		var request = "<host><data>"+ip+"</data><host-type>A</host-type><hostname>"+host+"</hostname></host>"
		self.findDNSRecord("A","hostname",host,function(data){
			if(data.length > 0)
				console.log("already exists",host,data[0].id,data)
			else
				self.zerigoAPI("create",request,function(err,result){
					console.log("created host ",host,ip,result);
				 	self.updateDNSList(callback);
				});
		});
	}
	else 
		console.log("missing host");
}

Zerigo.prototype.deleteDNSHost = function(host,callback){
	var self = this;
	if(!_.isFunction(callback))
		callback = function(){};
	
	if(_.isString(host)){
		self.findDNSRecord("A","hostname",host,function(data){
			if(data.length < 0)
				console.log("doesnt exist",host)
			else
				_.each(data,function(v){
					self.zerigoAPI("delete",v.id,function(err,result){
						console.log("deleted host ",host,result);
					 	self.updateDNSList(callback);
					});
				})
		});
	}
	else 
		console.log("missing host");


}


Zerigo.prototype.findDNSRecord = function(type,key,value,callback){
	var self = this;
	if(!_.isFunction(callback))
		callback = function(){};

	var result = [];
	 fs.readFile(path.join(myDir,"circlesio.json"), function (err,data) {
			  		if (err) throw err;
			 			var json = JSON.parse(data);
			 			_.each(json,function(v,k){ 
			 					if (v[key] == value){
			 						result.push(v)
			 					}
			 			})
			 			callback(result);
					});
}

Zerigo.prototype.zerigoAPI = function(method,data,options,callback){
	var self = this;
	var  op 		= {}
		,result 	= ""
		,error 		= null
		,query 		= null
		,req;	

	if(_.isFunction(options)){
		callback = options;
		options = {zone : this.options.zone};
	}
	else if(!_.isObject(options)){
		options = {zone : this.options.zone};
	}
	options = _.extend(options,{zone : this.zone});
	if(_.isFunction(data)){
		callback = data;
		data = {};
	}

	if(!_.isFunction(callback))
		callback = function(){};

		op.host 		= "ns.zerigo.com";
		op.headers 		= {"content-type": "application/xml"};
		op.auth 		= this.auth;
		op.port 		= 80;
	switch(method){
		case "create":
			op.method 	= "POST";
			data 		= (_.isString(data))? data : data.body;
			op.path 	= "/api/1.1/zones/"+options.zone+"/hosts.xml";
			op.headers['Content-Length']= data.length;
		break;
		case "update":
			op.method 	= "PUT";
			op.path 	= "/api/1.1/zones/"+options.zone+"/hosts/"+data.id+".xml";
			data 		= data.body;
			op.headers['Content-Length']= data.length;
		break;
		case "delete":
			op.method 	= "DELETE";
			data 		= (_.isString(data))? data : data.id;
			op.path 	= "/api/1.1/zones/"+options.zone+"/hosts/"+data+".xml";
			op.headers['Content-Length']= 0;
			data 		= null;
		break;
		default:
			op.method	= "GET";
			op.path 	= "/api/1.1/zones/"+options.zone+"/hosts.xml";
			data 		= null;
		break;
	}

	req = http.request(op, function(res) {
		res.on('data', function (chunk) {
			result +=chunk;
  	});
  	res.on("end",function(){
			callback(error,result);
		})
	});
	req.on('error', function(e) {
  		callback(e.message,result);
	});

	if(data != null)
		req.write(data)
	
		req.end();

}