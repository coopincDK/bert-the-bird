using UnityEngine;
using System.Collections;

public class SpawnScript : MonoBehaviour {
	public GameSpeed gs;
	public GameObject[] Enemies;
	public float SpawnMin = 0;
	public float SpawnMax = 0;
	Vector3 SpawnPos;
	bool first = true;
	float spawnin = 0;
	bool Spawning;


	void FixedUpdate() {
		if (!Spawning) {
			if (!Statics.PreWarmMode && Statics.GameRunning) {
				Spawning = true;
				Spawn();
			}
					
		}
		else {
			if (Statics.PreWarmMode || !Statics.GameRunning || Statics.Dead) {
				Spawning = false;
			}
		}

	}

	void Start () {
		Spawn ();
	}

	void Spawn() {


		spawnin = Random.Range (SpawnMin / gs.Difficulty, SpawnMax / gs.Difficulty);
		SpawnPos = transform.position;


		if (!first && Statics.GameRunning && !Statics.PreWarmMode) {
			LevelPool.Instanciate(transform.position);
		}
		if (first) {
			Invoke ("Spawn", spawnin );
			first = false;
		}
	}

	void OnTriggerEnter2D (Collider2D other) {
		if (Spawning)
		Invoke ("Spawn", spawnin );
	}
}
