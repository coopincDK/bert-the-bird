using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using System.Linq;


public enum PowerUpType {
	Magnet,
	Shield,
	Focus
}


public class PowerUpSpawner : MonoBehaviour {
	bool first = true;
	[SerializeField]
	public List<PowerUpScript> PowerUps;
	PowerUpScript SpawnPowerUp;
	public static PowerUpSpawner instance;
	float spawnin;
	void Awake () {
		instance = this;
	}

	void Start () {
		Spawn ();
	}
	
	void Spawn() {

		if (!first && Statics.GameRunning && !Statics.PreWarmMode) {
			List<PowerUpScript> AvailablePowerUps = PowerUps.Where(p => p.ReadyAt < Time.time).ToList();

			if (AvailablePowerUps.Count > 0) {
				SpawnPowerUp = AvailablePowerUps[Random.Range(0, AvailablePowerUps.Count)];
				SpawnPowerUp.PowerUpGameObject.SetActive(true);
				SpawnPowerUp.PowerUpGameObject.transform.localPosition = new Vector3(Random.Range(-2f, 2f), 0, 0);
			}
			spawnin = Random.Range (SpawnPowerUp.SpawnMin, SpawnPowerUp.SpawnMax);

		} else {
			spawnin = Random.Range (15f,25f);
		}

		Invoke ("Spawn", spawnin );
		
		if (first) {
			first = false;
		}
	}

	public void Reset() {
		if (SpawnPowerUp != null)
		SpawnPowerUp.gameObject.SetActive (false);

		foreach (PowerUpScript pu in PowerUps) {
			pu.ReadyAt = 0f;
		}
	}

}
