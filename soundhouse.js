javascript: (function () {
  //lodash読み込み
  var script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js";
  document.body.appendChild(script);

  //lodash読み込み後に本体スタート
  script.onload = function () {
    //購入履歴ページから注文番号を取得して注文番号をフックにして注文詳細ページをfetch
    var number_elm = document.querySelectorAll(".number span");
    var targets = [];
    _.forEach(number_elm, function (elm) {
      var document2_url =
        "https://www.soundhouse.co.jp/customers/order_history/detail/?OrderNo=" +
        elm.textContent +
        "&ipage=1&year=6";
      targets.push(document2_url);
    });

    Promise.all(
      targets.map((target) =>
        fetch(target).then(function (result) {
          return result.text();
        })
      )
    ).then(function (texts) {
      //fetchをpromise.allで取得した後スクリプト再開

      var results = [];
      //注文詳細ページテキストをdomparse
      _.forEach(texts, function (text) {
        results.push(new DOMParser().parseFromString(text, "text/html"));
      });

      var orderBox_elm = document.querySelectorAll(".orderBox");

      var objar = [];
      for (var i = 0; i < orderBox_elm.length; i++) {
        var obj = {};
        obj.アイテム配列 = [];

        obj.状態 = orderBox_elm[i].querySelector(".head .status").textContent;
        obj.注文日 =
          orderBox_elm[i].querySelector(".head .date span").textContent;
        obj.注文番号 =
          orderBox_elm[i].querySelector(".head .number span").textContent;
        obj.実際合計金額 = orderBox_elm[i]
          .querySelector(".head .total span")
          .textContent.replace(/¥|,/g, "");
        //注文番号フックでfetchした注文詳細ページのdomから注文番号と収書入力情報を取得
        var dds = results[i].querySelectorAll("#orderDetail .confirmDetail dd");
        _.forEach(dds, function (dd) {
          if (dd.textContent.includes("宛先")) {
            obj.領収書宛先 = dd.textContent.replace("宛先：", "");
          } else if (dd.textContent.includes("但し書き")) {
            obj.領収書但し書き = dd.textContent.replace("但し書き：", "");
          }
        });

        var counter = 1;

        do {
          obj2 = {};
          var itemInfo_elm = orderBox_elm[i].querySelector(
            "#li_" + obj.注文番号 + "-" + counter
          );
          obj2.メーカー = itemInfo_elm.querySelector(".maker").textContent;
          obj2.名前 = itemInfo_elm.querySelector(".name").textContent;
          var priceTempAr = itemInfo_elm
            .querySelector(".price")
            .innerText.split("数量：");

          obj2.個別価格 = priceTempAr[0].replace(/¥|,/g, "");

          if (typeof priceTempAr[1] === "undefined") {
            obj2.数量 = "";
          } else {
            obj2.数量 = priceTempAr[1];
          }
          obj2.ポイント利用額 = 0;
          obj.アイテム配列.push(obj2);
          counter++;
        } while (
          orderBox_elm[i].querySelector("#li_" + obj.注文番号 + "-" + counter)
        );

        objar.push(obj);
      }
      //細工

      //ポイント使用処理。個別金額を直接修正
      _.forEach(objar, function (obj, index) {
        var sum = 0;
        var itemobj_counter = 0;
        //ポイント使用額を算出（ある場合は数値上プラスで出す）
        _.forEach(obj.アイテム配列, function (item) {
          sum += parseInt(item.個別価格);
          itemobj_counter++;
        });
        var point_use = sum - obj.実際合計金額;

        //obj.アイテム配列を個別価格で降順ソート
        obj.アイテム配列 = _.orderBy(
          obj.アイテム配列,
          function (a) {
            return parseInt(a.個別価格);
          },
          "desc"
        );
        //個別価格で降順下obj.アイテム配列を順にポイント引いていく（高い順）
        if (point_use > 0) {
          _.forEach(obj.アイテム配列, function (item) {
            var sagaku = item.個別価格 - point_use;
            if (sagaku < 0) {
              item.個別価格 = 0;
              item.ポイント利用額 = point_use;
              point_use = -sagaku;
            } else {
              item.個別価格 = sagaku;
              item.ポイント利用額 = point_use;
              point_use = 0;
            }
          });
        }
      });

      //object in object の正規化
      var seiki_objar = [];

      _.forEach(objar, function (obj) {
        _.forEach(obj.アイテム配列, function (item) {
          var temp_obj = {};

          temp_obj.実際合計金額 = obj.実際合計金額;
          temp_obj.注文日 = obj.注文日;
          temp_obj.注文番号 = obj.注文番号;
          temp_obj.状態 = obj.状態;
          temp_obj.領収書宛先 = obj.領収書宛先;
          temp_obj.領収書但し書き = obj.領収書但し書き;
          temp_obj.摘要相手先 = "ライフカード（サウンドハウス）";
          temp_obj.支払元入金先 = "楽7630295";
          temp_obj.収支 = "支出";
          temp_obj.小計備考 = "";
          temp_obj.スペース = "";
          temp_obj.メーカー = item.メーカー;
          temp_obj.金額 = item.個別価格;
          temp_obj.名前 = item.名前;
          temp_obj.摘要内容 = item.メーカー + " " + item.名前;
          if (item.数量 === "") {
            item.数量 = 1;
          }
          temp_obj.数量 = item.数量;
          temp_obj.ポイント利用額 = item.ポイント利用額;
          temp_obj.単価 = parseInt(item.個別価格) / parseInt(item.数量);
          seiki_objar.push(temp_obj);
        });
      });

      var top_key = [
        "年度",
        "月",
        "日付",
        "code",
        "収支",
        "大科目",
        "小科目",
        "摘要相手先",
        "摘要内容",
        "支払元入金先",
        "金額",
        "小計備考",
        "属性①",
        "属性②",
        "属性③",
        "スペース",
        "注文日",
        "注文番号",
        "数量",
        "単価",
        "ポイント利用額",
        "領収書宛先",
        "領収書但し書き",
      ];
      var csvText = join2csvTextByOrder(seiki_objar, top_key, ",");

      exportCSV(csvText, "soundhouse");
    });

    function join2csvTextByOrder(objar, top_key, delimiter) {
      var header = top_key.join(delimiter) + "\n";

      var body = "";
      var gyou = "";

      _.forEach(objar, function (obj) {
        var gyouar = [];
        _.forEach(top_key, function (key) {
          gyouar.push(obj[key]);
        });
        body += gyouar.join(delimiter) + "\n";
      });

      return header + body;
    }

    //jsonをcsv文字列に編集する
    function jsonToCsv(json, delimiter) {
      var header = Object.keys(json[0]).join(delimiter) + "\n";
      var body = json
        .map(function (d) {
          return Object.keys(d)
            .map(function (key) {
              return d[key];
            })
            .join(delimiter);
        })
        .join("\n");

      return header + body;
    }

    //csv変換
    function exportCSV(csvText, filename) {
      //文字列に変換する

      //拡張子
      var extention = "csv";

      //出力ファイル名
      var exportedFilenmae = (filename || "export") + "." + extention;

      //BLOBに変換
      var blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvText], {
        type: "text/csv",
      });

      if (navigator.msSaveBlob) {
        // for IE 10+
        navigator.msSaveBlob(blob, exportedFilenmae);
      } else {
        //anchorを生成してclickイベントを呼び出す。
        var link = document.createElement("a");
        if (link.download !== undefined) {
          var url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", exportedFilenmae);
          link.style.visibility = "hidden";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    }
  };
})();
