using UnityEngine;
using System.Collections;

public class ShieldScript : MonoBehaviour
{
	public int SpawnCount;
	public float Duration;
	public int ShieldsUsed;

	//Shields and spawn variables
	public ParticleSystem ShieldSplinterParticles;
	public Transform[] Shields;
	public Transform ShieldSpawner;
	public Transform ShieldSpawnPosition;
	float ShieldSpawnSpeed = 3f;
	int CurrentShieldStep = 1;
	float ShieldSpawnSteps = 0;
	float CurrentSpawnerRotation;
	float spawnerLerpProgress = 0;


	public bool isActive = false;
	bool isFullyActive = false;
	bool isDeactivating = false;
	bool isSpawningShields = false;
	public AudioClip ShieldOff;
	public AudioClip ShieldBreak;

	public ShopItemScript ShieldCountItem;
	public ShopItemScript ShieldTimeItem;


	float TimeLeft = 0f;


	void OnEnable() {
		//Invoke ("StartShieldSpawning", 5);
		Duration = 10 + (ShieldTimeItem.currentAmount * 5);
		SpawnCount = 1 + (ShieldCountItem.currentAmount);

		foreach (Transform shield in Shields) {
			shield.gameObject.SetActive(false);
		} 
		ShieldsUsed = 0;
		Activate (Duration);
		GetComponent<AudioSource>().Play ();

		StartShieldSpawning ();
	}


	void StartShieldSpawning() {
		ShieldSpawner.gameObject.SetActive(true);
		ShieldSpawner.localRotation.eulerAngles.Set(0,0,0);
		spawnerLerpProgress = 0;
		CurrentSpawnerRotation = 0;
		ShieldSpawnSteps = 360 / SpawnCount;
		CurrentShieldStep = 1;
		isSpawningShields = true;
	}

	bool isUsingShield = false;
	float ShieldCooldown = 0.5f;

	public void UseShield() {
		Transform DestroyThis = Shields [ShieldsUsed];

		if (!DestroyThis.gameObject.activeSelf) {
			Invoke("UseShield", 0.3f);
			return;
		}
		if (!isUsingShield) {
			isUsingShield = true;

			if (ShieldsUsed < SpawnCount) {
				ShieldSplinterParticles.transform.position = DestroyThis.position;
				DestroyThis.gameObject.SetActive(false);
				ShieldSplinterParticles.Play();
				GetComponent<AudioSource>().PlayOneShot(ShieldBreak);
				ShieldsUsed++;
			}

			if (ShieldsUsed >= SpawnCount) {
				StopPowerUp();
			}

		}
	}

	public void StopPowerUp() {
		if (!isFullyActive)
			isFullyActive = true;

		TimeLeft = 0;
	}

	void SpawnShields() {
		spawnerLerpProgress += (ShieldSpawnSpeed / SpawnCount) * Time.deltaTime;
		CurrentSpawnerRotation = Mathf.Lerp (0f, 361 + ShieldSpawnSteps, spawnerLerpProgress);
		Vector3 rot = ShieldSpawner.eulerAngles;
		rot.z = -CurrentSpawnerRotation;
		ShieldSpawner.localEulerAngles = rot;
		if (CurrentSpawnerRotation > ShieldSpawnSteps * CurrentShieldStep) {
				Transform CurrentShield = Shields[CurrentShieldStep - 1];
				CurrentShield.gameObject.SetActive(true);
				CurrentShield.transform.position = ShieldSpawnPosition.position;
				if (CurrentShieldStep == SpawnCount) {
					ShieldSpawner.gameObject.SetActive(false);
					isSpawningShields = false;
				}
			CurrentShieldStep++;
		}
	}



	void Update() {
		if (isUsingShield) {
			ShieldCooldown -= Time.deltaTime;
			if (ShieldCooldown < 0) {
				isUsingShield = false;
				ShieldCooldown = 0.5f;
			}
		}


		if (isActive) {
			if (!isFullyActive) {
				//ShowAnimation (scale)
				transform.localScale = Vector3.Lerp(transform.localScale, new Vector3(1,1,1), 3f * Time.deltaTime);
				if (transform.localScale.x >= 0.98) {
					transform.localScale = new Vector3(1,1,1);
					isFullyActive = true;
				}
			} 


			TimeLeft -= Time.deltaTime;
			if (TimeLeft < 0) {
				if (!isDeactivating) {
					isDeactivating = true;
					if (!GetComponent<AudioSource>().isPlaying)
						GetComponent<AudioSource>().PlayOneShot(ShieldOff);
				}
				Deactivate();
			}

			if (isSpawningShields){
				SpawnShields();
			} 
		}
	}



	void Activate(float time) {
		//if (!isActive) {
			transform.localScale = Vector3.zero;
			isActive = true;
			isFullyActive = false;
			TimeLeft = time;
		//}
	}

	void Deactivate() {
		isSpawningShields = false;
		transform.localScale = Vector3.Lerp(transform.localScale, new Vector3(0,0,0), 3.5f * Time.deltaTime);
		if (transform.localScale.x <= 0.1) {
			transform.localScale = new Vector3(0,0,0);
			isActive = false;
		}

		if (!isActive) {
			Statics.PowerUpActive = false;
			isDeactivating = false;
			gameObject.SetActive (false);
		}



	}
}