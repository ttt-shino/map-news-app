window.addEventListener("load", function () {
  const tokyoStation = { lat: 35.681236, lng: 139.767125 };
  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 5,
    center: tokyoStation,
    gestureHandling: 'greedy',
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
        let earliestMatch = null;
        let earliestIndex = Infinity;
      
        for (const loc of locations) {
          const index = text.indexOf(loc.name);
          if (index !== -1 && index < earliestIndex) {
            earliestMatch = loc;
            earliestIndex = index;
          }
        }
      
        if (!earliestMatch) {
          console.log("❌ マッチしなかった記事:", item.title);
          return null;
        } else {
          console.log("✅ マッチ:", item.title, "➡", earliestMatch.name);
          return {
            title: item.title,
            description: item.description,
            url: item.link,
            location: earliestMatch.name,
            lat: earliestMatch.lat,
            lng: earliestMatch.lng
          };
        }
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
        <div style="max-width: 90vw; font-size: 16px; line-height: 1.5;">
          <h3 style="font-size: 18px;">${article.title}</h3>
          <p>${article.description.replace(/<img[^>]*>/g, "")}</p>
          <p><a href="${article.url}" target="_blank" style="color: #2196F3;">記事を読む</a></p>
        </div>
      `,
    });

    currentInfoWindow.open(map, currentMarker);
    index = (index + 1) % articles.length;
  }
});