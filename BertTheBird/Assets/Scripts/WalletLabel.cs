using UnityEngine;
using System.Collections;
using CodeStage.AntiCheat.ObscuredTypes;


public class WalletLabel : MonoBehaviour {
	public float updateInterval = 0.5F;

	public Valuta valuta;
	public ParticleSystem ParticleBurst;

	[HideInInspector]
	public UILabel Label;
	TweenScale ScaleEffect;
	float OrgAmount = 0;
	float NewAmount = 0;
	float steps = 0;
	int individualBurstSize = 1;
	bool AddingMoney;
	float timeleft;
	
	int previousValue = 0;
	
	//AudioScale
	float currentPitch;
	float startPitch = 0.4f;
	float endPitch = 0.9f;
	float pitchSteps = 0;
	
	// Use this for initialization
	void Awake () {
		ScaleEffect = GetComponent<TweenScale> ();
		Label = GetComponent<UILabel> ();
	}
	
	void Update () {
		if (AddingMoney) {
			timeleft -= Time.deltaTime;
			if (timeleft <= 0 && OrgAmount < NewAmount) {
				timeleft = updateInterval;
				OrgAmount += steps;
				if (OrgAmount >= NewAmount) {
					OrgAmount = NewAmount;
					AddingMoney = false;
					ScaleEffect.enabled = false;
					previousValue = 0;

				}
				int newA = (int)OrgAmount;
				if (newA > previousValue) {
					PlaySound();
					previousValue = newA;
					Label.text = Format.Number(OrgAmount);
					ParticleBurst.Emit (individualBurstSize);
				}

				if (!AddingMoney)  {
					Label.text = Format.Number(valuta == Valuta.Gem ? Game.Wallet.Gems : Game.Wallet.Stars);
				}
			}
		}
	}
	
	void PlaySound() {
		
		if (valuta == Valuta.Star) {
			Statics.Sounds.StarAdd.PlayOneShot(currentPitch);
		}
		else if (valuta == Valuta.Gem) {
			Statics.Sounds.GemAdd.PlayOneShot(currentPitch);
		}
		currentPitch += pitchSteps;
	}
	
	public void PlayEffect(ObscuredInt Amount) {
		PlayEffect (Amount, 0);
	}
	
	public void PlayEffect(ObscuredInt Amount, float delay) {
		if (Amount > 0) {
			SetSteps (Amount);
			timeleft = updateInterval;
			ScaleEffect.enabled = true;

			if (valuta == Valuta.Star) {
				OrgAmount = Game.Wallet.Stars;
				NewAmount = Game.Wallet.Stars + Amount;
			}
			else if (valuta == Valuta.Gem) {
				OrgAmount = Game.Wallet.Gems;
				NewAmount = Game.Wallet.Gems + Amount;
			}

			Invoke ("Burst", delay);
				
		}
	}
	
	public void Burst() {
		AddingMoney = true;
		float starcount = (NewAmount - OrgAmount) * 0.5f;
		if (starcount < 1) 
			starcount = 1;
		else if (starcount > 75) 
			starcount = 75;
		
		if (starcount > 4) {
			ParticleBurst.Emit ((int)starcount);
		}
	}

	//amount 1000 * mt = 666.66666
	// 1333.3333333
	void SetSteps (int Amount) {
		//Star steps
		float maxTime = 3f;
		float maxTimeAmount = 3000;
		float time = (((float)Amount / maxTime) / (maxTimeAmount / maxTime) * maxTime) + 0.2f;
		if (time > 5)
			time = 5;
		steps = (float)Amount / (time / updateInterval);
		if (steps < 1) {
			steps = 1;
		}
		//AudioPitch Steps
		currentPitch = startPitch;
		pitchSteps = (endPitch - startPitch) / (time / updateInterval);
		
		//set individual burstSize
		if (Amount < 5)
			individualBurstSize = 1;
		else if (Amount < 500)
			individualBurstSize = 2;
		else
			individualBurstSize = 3;
	}	
}
