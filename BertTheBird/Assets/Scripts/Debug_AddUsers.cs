using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using CodeStage.AntiCheat.ObscuredTypes;
using Kernys.Bson;

public class Debug_AddUsers : MonoBehaviour {
	bool AddingUsers;
	UILabel label;
	string today = "2014-04-29";
	string[] Names = "Chieko Porch,Mui Dodd,Iona Jaimes,Joye Mccroskey,Jerold Laxton,Diamond Branstetter,Hobert Hydrick,Darlene Spruell,Tessie Dease,Eula Ricker,Jackelyn Delorme,Drew Janz,Maisie Menges,Latesha Capobianco,Rosalba Rossell,Erlene Averett,Maragret Amundsen,Maxie Hibbitts,Shirl Dejong,Carroll Ellingson,Ashleigh Mclees,Leeann Wenner,Alysa Frankum,Twila Vanriper,Gearldine Borel,Alta Rupert,Letha Honeycutt,Lowell Belmonte,Gerri Pough,Jordan Kleven,Tommie Wiggin,Lino Quail,Patty Berns,Kaylene Malinowski,Miranda Puglisi,Elroy Kowaleski,Brigida Kulinski,Yon Mcnatt,Armida Noguera,Felecia Sugarman,Jeffry Easterday,Dick Sheffer,Kiyoko Riffel,Josette Roberti,Regena Hurla,Zana Mullet,Phillip Deland,Myrl Lightsey,Malik Severa,Eliseo Salvato".Split(',');
	AES AES = new AES (false, false);
	// Use this for initialization
	void Start() {
		label = transform.FindChild ("Label").GetComponent<UILabel> ();
	}

	public void Toggle () {
		AddingUsers = !AddingUsers;
		if (AddingUsers) {
			label.text = "STOP";
		} else {
			label.text = "START";
		}
	}




	// Update is called once per frame
	void Update () {
		if (AddingUsers) {
			AddUser();
			AddUser();
			AddUser();
		}

	}

	void AddUser () {
		int SyncData_Currency = 400;
		int SyncData_PremiumCurrency = 500;
		string SyncData_Achievements = "1,2,3,4,5";
		string SyncData_ItemsBourght = "3,6,7,4,2,1";
		string SyncData_ItemsUsed = "";
		string SyncData_HighScores = "1:" + Random.Range(1,1000) + ":" + Random.Range(2,50) + ":" + Random.Range(10,180) + ":" + today + ":" + Random.Range(1,950) + ":" + Random.Range(2,50) + ":" + Random.Range(10,180) + ":";
		string SyncData_Levels = "1:True:False:0";
		bool Sync_Currency = SyncData_Currency != 0;
		bool Sync_PremiumCurrency = SyncData_PremiumCurrency != 0;
		bool Sync_Achievements = SyncData_Achievements.Length > 0;
		bool Sync_ItemsBourght = SyncData_ItemsBourght.Length > 0;
		bool Sync_ItemsUsed = SyncData_ItemsUsed.Length > 0;
		bool Sync_HighScores = SyncData_HighScores.Length > 0;
		bool Sync_Levels = SyncData_Levels.Length > 0;
		
		var obj = new BSONObject ();
		obj["method"] = "sync";
		obj ["UserID"] = Random.Range (10000000,683494669);
		obj["GameID"] = Game.Id;
		obj["TimeStamp"] = (string)SyncData.TimeStamp;
		
		
		obj["User"] = new BSONObject();
		if (SyncData.UpdateFacebookName)
			obj["User"]["FacebookName"] = Names[Random.Range(0,49)];
		
		
		
		obj["SyncData"] = new BSONObject();
		if (Sync_Currency)
			obj["SyncData"]["Currency"] = SyncData_Currency;
		if (Sync_PremiumCurrency) 
			obj["SyncData"]["PremiumCurrency"] = SyncData_PremiumCurrency;
		if (Sync_Achievements)
			obj["SyncData"]["Achievements"] = SyncData_Achievements;
		if (Sync_ItemsBourght)
			obj["SyncData"]["ItemsBourght"] = SyncData_ItemsBourght;
		if (Sync_ItemsUsed)
			obj["SyncData"]["ItemsUsed"] = SyncData_ItemsUsed;
		if (Sync_HighScores)
			obj["SyncData"]["HighScores"] = SyncData_HighScores;
		if (Sync_Levels)
			obj["SyncData"]["Levels"] = SyncData_Levels;
		
		byte[] bson = SimpleBSON.Dump(obj);
		
		
		new WWW (Game.postUrl, AES.write(bson));
	}
}

