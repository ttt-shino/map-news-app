window.addEventListener("load", function () {
  const tokyoStation = { lat: 35.681236, lng: 139.767125 };
  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 5,
    center: tokyoStation,
    styles: [
      { elementType: "geometry", stylers: [{ color: "#212121" }] },
      { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
      { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
      { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
      { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
      { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
      { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
      { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#181818" }] },
      { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
      { featureType: "poi.park", elementType: "labels.text.stroke", stylers: [{ color: "#1b1b1b" }] },
      { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
      { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
      { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
      { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
      { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#4e4e4e" }] },
      { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
      { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
      { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
      { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] }
    ]
  });

  let locations = [];
  let articles = [];
  let index = 0;
  let currentMarker = null;
  let currentInfoWindow = null;

  const rssFeeds = [
    "https://www.nhk.or.jp/rss/news/cat6.xml"
  ];

  fetch("locations.json")
    .then(res => res.json())
    .then(locationData => {
      locations = locationData;
      return Promise.all(
        rssFeeds.map(feedUrl =>
          fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`)
            .then(res => res.json())
        )
      );
    })
    .then(feedResults => {
      const allItems = feedResults.flatMap(result => result.items || []);

      articles = allItems.map(item => {
        const text = `${item.title} ${item.description}`;
        const match = locations.find(loc => {
          const pattern = new RegExp(loc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          return pattern.test(text);
        });

        if (!match) {
          console.log("❌ マッチしなかった記事:", item.title);
        } else {
          console.log("✅ マッチ:", item.title, "➡", match.name);
        }

        return match && match.lat && match.lng ? {
          title: item.title,
          description: item.description,
          url: item.link,
          lat: match.lat,
          lng: match.lng
        } : null;
      }).filter(Boolean);

      articles = articles.sort(() => Math.random() - 0.5);

      if (articles.length > 0) {
        showNextArticle();
        setInterval(showNextArticle, 30000);
      } else {
        console.log("地名が見つかる記事がありませんでした。");
      }
    })
    .catch(error => {
      console.error("データの取得に失敗しました:", error);
    });

  function showNextArticle() {
    console.log(`📍 表示中の記事 index: ${index}, 総記事数: ${articles.length}`);
    const article = articles[index];
    if (!article) return;

    if (currentMarker) currentMarker.setMap(null);
    if (currentInfoWindow) currentInfoWindow.close();

    currentMarker = new google.maps.Marker({
      map: map,
      position: { lat: article.lat, lng: article.lng },
      title: article.title,
    });

    currentInfoWindow = new google.maps.InfoWindow({
      content: `
        <div style="max-width: 250px; font-size: 14px; line-height: 1.4;">
          <h3 style="font-size: 16px;">${article.title}</h3>
          <p>${article.description.replace(/<img[^>]*>/g, "")}</p>
          <p><a href="${article.url}" target="_blank">記事を読む</a></p>
        </div>
      `,
    });

    currentInfoWindow.open(map, currentMarker);
    index = (index + 1) % articles.length;
  }
});