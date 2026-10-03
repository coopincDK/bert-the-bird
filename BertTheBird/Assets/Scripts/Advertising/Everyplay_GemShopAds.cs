using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class Everyplay_GemShopAds : MonoBehaviour {

	private bool _campaignsAvailable = false;
	[SerializeField]
	public List<GameObject> ShowWhenReady;
	public bool HideWhenNotReady = true;

	void Awake() {
		#if !UNITY_EDITOR
		if (HideWhenNotReady) {
			foreach (GameObject go in ShowWhenReady) {
				NGUITools.SetActive(go, false);	
			}
		}
		#endif



		UnityAds.setCampaignsAvailableDelegate(ApplifierImpactCampaignsAvailable);
		UnityAds.setHideDelegate(ApplifierImpactClose);
		UnityAds.setShowDelegate(ApplifierImpactOpen);
		UnityAds.setCampaignsFetchFailedDelegate(ApplifierImpactCampaignsFetchFailed);
		UnityAds.setVideoCompletedDelegate(ApplifierImpactVideoCompleted);
		UnityAds.setVideoStartedDelegate(ApplifierImpactVideoStarted);
	}

	public void PlayCommercial () {

		Debug.Log ("Playing Commecial");
		if (_campaignsAvailable) {
			//ApplifierImpactMobileExternal.Log("Play Impact Clicked");

			UnityAds.show(Everyplay.GameID + "-default");
		}	
	}

	//
	//  EVENT BINDINGS
	//

	void ApplifierImpactVideoCompleted(string rewardItemKey, bool skipped) {
		//Debug.Log ("IMPACT: VIDEO COMPLETE : " + rewardItemKey + " - " + skipped);
		if (!skipped) {
			Game.Wallet.AddGems(1);
			
		}
	}
	
	void ApplifierImpactVideoStarted() {
		//Debug.Log ("IMPACT: VIDEO STARTED!");
	}
	
	void ApplifierImpactCampaignsAvailable() {
		//Debug.Log ("IMPACT: CAMPAIGNS READY!");
		foreach (GameObject go in ShowWhenReady) {
			NGUITools.SetActive(go, true);	
		}
		_campaignsAvailable = true;
	}
	
	void ApplifierImpactCampaignsFetchFailed() {
		//Debug.Log ("IMPACT: CAMPAIGNS FETCH FAILED!");
	}
	
	void ApplifierImpactOpen() {
		//Debug.Log ("IMPACT: OPEN!");
	}
	
	void ApplifierImpactClose() {
		//Debug.Log ("IMPACT: CLOSE!");
	}
}
