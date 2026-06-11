
let desenhoAtual = null;

coordenadasGaranhuns = [-8.890278, -36.492778]

//Definir a coordenada e zoom inicial
const map = L.map('map', {pmIgnore: false}).setView(coordenadasGaranhuns, 14);
let camadaRetangulos = L.layerGroup().addTo(map);

/*
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
}).addTo(map);
*/

function calcularAlturasFatia(coordenadas, lngAtual) {
    let pontosDeCorte = [];

    // Varre todas as arestas do polígono
    for (let j = 0; j < coordenadas.length; j++) {
        let p1 = coordenadas[j];
        let p2 = coordenadas[(j + 1) % coordenadas.length]; // Fecha o circuito com o próximo ponto

        // Verifica se a longitude atual passa entre p1 e p2
        if ((p1.lng <= lngAtual && p2.lng > lngAtual) || (p2.lng <= lngAtual && p1.lng > lngAtual)) {
            // Interpolação linear para achar a latitude exata do corte
            let t = (lngAtual - p1.lng) / (p2.lng - p1.lng);
            let latCorte = p1.lat + t * (p2.lat - p1.lat);
            pontosDeCorte.push(latCorte);
        }
    }

    // Se cruzou o polígono corretamente (achou teto e piso), retorna os valores
    if (pontosDeCorte.length >= 2) {
        return {
            tetoLat: Math.max(...pontosDeCorte),
            pisoLat: Math.min(...pontosDeCorte)
        };
    }

    // Se não cruzou o polígono nessa longitude, retorna null
    return null;
}

function gerarCorAleatoria() {

    const cores = ['#2ec4b6', '#e71d36', '#ff9f1c', '#011627', '#4361ee', '#7209b7', '#f72585', '#4caf50'];

    return cores[Math.floor(Math.random() * cores.length)];
}

function verificarPoligono(layer){
    let coordenadas = layer.getLatLngs()[0]
    let  gj = layer.toGeoJSON()

    const  poligonos = turf.unkinkPolygon(gj)
    if(poligonos.features.length > 1){
        console.log('O polígono possui linhas que se cruzam')
        return false;
    }

    return true;
}

function calcularArea(layer, shape){
    //Cálculos comuns
    if (shape == 'Rectangle'){
        let vertices = layer.getLatLngs()[0]
        let ponto1 = vertices[0]
        let ponto2 = vertices[1]
        let ponto3 = vertices[2]

        let base = map.distance(ponto1, ponto2)
        let altura = map.distance(ponto2, ponto3)

        let area = base*altura
        let areaExata = turf.area(layer.toGeoJSON())

        const texto = `A área do retângulo é ${area.toFixed(2)} m²`

        console.log(`Área exata do retângulo ${areaExata}`)

        layer.bindPopup(texto).openPopup();
    }
        



        if(shape=='Circle'){
            let raio = layer.getRadius();
            let area = Math.PI * Math.pow(raio, 2)


            const texto = `A área do círculo é ${area.toFixed(2)} m²`

            centro = layer.getLatLng()
            centroGJ = [centro.lng, centro.lat]
            let circuloPoligonoGeoJSON = turf.circle(centroGJ, raio / 1000, { steps: 10000, units: 'kilometers' });

            areaExata = turf.area(circuloPoligonoGeoJSON)

            console.log(`Área do círculo ${areaExata}`)

        layer.bindPopup(texto).openPopup();

        }

        if(shape=='Polygon'){
            let areaTotal = 0;
            if(verificarPoligono(layer)){
                let coordenadas = layer.getLatLngs()[0];
                let minLng = Math.min(...coordenadas.map(p => p.lng));
                let maxLng = Math.max(...coordenadas.map(p => p.lng));
                let n = parseInt(document.getElementById('txt-n-riemann').value);
                
                // Calcular larguras/deltas dos retângulos
                let deltaLng = (maxLng - minLng) / n;
                let menorLatGlobal = Math.min(...coordenadas.map(p => p.lat));
                let deltaMetros = map.distance(L.latLng(menorLatGlobal, minLng), L.latLng(menorLatGlobal, minLng + deltaLng));

                //  Limpar desenho de retângulos anterior
                camadaRetangulos.clearLayers();

                // Soma de riemann
                for (let i = 0; i < n; i++) {
                    let lngAtual = minLng + i * deltaLng;
                    let lngProxima = lngAtual + deltaLng;
                    let lngMedio = lngAtual + deltaLng/2
                    let lngAnalise = (i==0)?lngMedio:lngAtual

                    let alturas = calcularAlturasFatia(coordenadas, lngAnalise); // Calcular a altura dos retangulos

                    if (alturas !== null) {
                        let tetoLat = alturas.tetoLat;
                        let pisoLat = alturas.pisoLat;

                        let alturaMetros = map.distance(L.latLng(tetoLat, lngAnalise), L.latLng(pisoLat, lngAnalise));
                        areaTotal += deltaMetros * alturaMetros;


                        let cantoS = L.latLng(pisoLat, lngAtual);
                        let cantoN = L.latLng(tetoLat, lngProxima);
                        let limitesRet = L.latLngBounds(cantoS, cantoN);

                        let retangulo = L.rectangle(limitesRet, {
                            color: '#000',
                            weight: 1,
                            fillColor: gerarCorAleatoria(),
                            fillOpacity: 0.35
                        });

                        camadaRetangulos.addLayer(retangulo);
                    }
                }

                //validação
                let areaTurf = turf.area(layer.toGeoJSON())
                let diferencaArea = Math.abs(areaTurf - areaTotal)
                let erroPercentual = diferencaArea/areaTurf*100
                
                console.log(`Área exata: ${areaTurf}`)
                console.log(`Margem de erro: ${erroPercentual}%`)

            } else{
                areaTotal = turf.area(layer.toGeoJSON())
            }

        const texto = `Área do polígono: ${areaTotal.toFixed(2)} m²`
        layer.bindPopup(texto).openPopup()
}
}

//Adicionar a visão de mapa
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <p>     Ícone adaptado de <a href="https://www.flaticon.com/free-icons/global" title="global icons">Global icons created by Freepik - Flaticon</a> </p>'
}).addTo(map);

//Adicionar a barra de ferramentas de desenho
map.pm.addControls({  
    position: 'topleft',  
    drawCircleMarker: false,
    rotateMode: true,
}); 

//Verificar o desenho atual
map.on('pm:create', function(e){
    const layer = e.layer;
    const shape = e.shape;

    if(desenhoAtual != null){
        map.removeLayer(desenhoAtual);
    }

    desenhoAtual = layer;

    calcularArea(layer, shape)

    layer.on('pm:edit', function(){
        calcularArea(layer, shape)
    })
})



map.on('pm:remove', function(e){
    if(desenhoAtual === e.layer){
        desenhoAtual = null
    }
})

document.getElementById('chk-mostrar-retangulos').addEventListener('change', function(e){
    if(e.target.checked){
        map.addLayer(camadaRetangulos);
    } else{
        map.removeLayer(camadaRetangulos)
    }
})

document.getElementById('txt-n-riemann').addEventListener('input', function(e){
    if(desenhoAtual != null && desenhoAtual.pm.getShape() === 'Polygon'){
        calcularArea(desenhoAtual, 'Polygon');
    }
})




