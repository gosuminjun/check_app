import "./App.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
} from "firebase/firestore";

const getTodayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
};

function App() {
  const initialPeople = useMemo(() => [], []);

  const [people, setPeople] = useState([]);
  const [currentCollection, setCurrentCollection] = useState("people");

  const [counts, setCounts] = useState({
    total: 0,
    people: 0,
    lab: 0,
    normal: 0,
    salad: 0,
  });

  useEffect(() => {
    const colRef = collection(db, currentCollection);

    const unsub = onSnapshot(colRef, async (snap) => {
      if (snap.size < initialPeople.length) {
        const existingIds = new Set(snap.docs.map((d) => Number(d.id)));
        const missing = initialPeople.filter((p) => !existingIds.has(p.id));

        await Promise.all(
          missing.map((p) =>
            setDoc(doc(colRef, String(p.id)), p, { merge: true })
          )
        );
      }

      const list = snap.docs
        .map((d) => d.data())
        .sort((a, b) => a.id - b.id);

      setPeople(list);
    });

    return () => unsub();
  }, [initialPeople, currentCollection]);

  useEffect(() => {
    const getStats = (snap) => {
      const docs = snap.docs.map((d) => d.data());

      return {
        total: docs.filter((d) => d.willEat && !d.onTrip).length,
        normal: docs.filter(
          (d) => d.willEat && !d.onTrip && d.mealType === "normal"
        ).length,
        salad: docs.filter(
          (d) => d.willEat && !d.onTrip && d.mealType === "salad"
        ).length,
      };
    };

    let peopleStats = { total: 0, normal: 0, salad: 0 };
    let labStats = { total: 0, normal: 0, salad: 0 };

    const updateCounts = () => {
      setCounts({
        people: peopleStats.total,
        lab: labStats.total,
        total: peopleStats.total + labStats.total,
        normal: peopleStats.normal + labStats.normal,
        salad: peopleStats.salad + labStats.salad,
      });
    };

    const unsubPeople = onSnapshot(collection(db, "people"), (snap) => {
      peopleStats = getStats(snap);
      updateCounts();
    });

    const unsubLab = onSnapshot(collection(db, "lab"), (snap) => {
      labStats = getStats(snap);
      updateCounts();
    });

    return () => {
      unsubPeople();
      unsubLab();
    };
  }, []);

  const formattedDate = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const mealPeople = useMemo(() => people.filter((p) => !p.onTrip), [people]);
  const tripPeople = useMemo(() => people.filter((p) => p.onTrip), [people]);

  const selectMeal = async (id, mealType) => {
    await updateDoc(doc(db, currentCollection, String(id)), {
      willEat: true,
      mealType,
    });
  };

  const cancelMeal = async (id) => {
    await updateDoc(doc(db, currentCollection, String(id)), {
      willEat: false,
      mealType: "",
    });
  };

  const goTrip = async (id) => {
    await updateDoc(doc(db, currentCollection, String(id)), {
      onTrip: true,
      willEat: false,
      mealType: "",
    });
  };

  const returnFromTrip = async (id) => {
    await updateDoc(doc(db, currentCollection, String(id)), {
      onTrip: false,
    });
  };

  const resetAllWillEat = async () => {
    await Promise.all(
      people
        .filter((p) => !p.onTrip)
        .map((p) =>
          updateDoc(doc(db, currentCollection, String(p.id)), {
            willEat: false,
            mealType: "",
          })
        )
    );
  };

  const autoResetIfNewDay = useCallback(async () => {
    const todayKey = getTodayKey();
    const metaRef = doc(db, "meta", "app");

    const metaSnap = await getDoc(metaRef);
    const lastResetDate = metaSnap.exists()
      ? metaSnap.data().lastResetDate
      : "";

    if (lastResetDate === todayKey) return;

    const collections = ["people", "lab"];

    for (const collectionName of collections) {
      const snap = await getDocs(collection(db, collectionName));

      await Promise.all(
        snap.docs.map((d) =>
          updateDoc(doc(db, collectionName, d.id), {
            willEat: false,
            mealType: "",
          })
        )
      );
    }

    await setDoc(metaRef, {
      lastResetDate: todayKey,
    });
  }, []);

  useEffect(() => {
    autoResetIfNewDay();
  }, [autoResetIfNewDay]);

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: 24 }}>
      <h1 style={{ marginBottom: 6 }}>
        {currentCollection === "people" ? "프로젝트팀" : "기술연구소"}
      </h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setCurrentCollection("people")}>
          프로젝트팀
        </button>
        <button onClick={() => setCurrentCollection("lab")}>
          기술연구소
        </button>
      </div>

      <div style={{ marginTop: 10, fontSize: 20 }}>
        {formattedDate} 식사 인원은 <strong>{counts.total}</strong>명 입니다.
      </div>

      <div style={{ marginTop: 6, fontSize: 15 }}>
        🍚 일반식 : <strong>{counts.normal}</strong>명{" / "}
        🥗 샐러드 : <strong>{counts.salad}</strong>명
      </div>

      <div style={{ marginTop: 6, fontSize: 15, opacity: 0.8 }}>
        프로젝트팀: <strong>{counts.people}</strong>명 / 기술연구소:{" "}
        <strong>{counts.lab}</strong>명
      </div>



      <section style={{ marginBottom: 22 }}>
        <h2 style={{ margin: "14px 0 10px" }}>식사 대상 리스트</h2>

        {mealPeople.length === 0 ? (
          <div style={{ opacity: 0.7 }}>현재 식사 대상자가 없습니다.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {mealPeople.map((p) => (
              <li
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  marginBottom: 10,
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <strong style={{ fontSize: 16 }}>{p.name}</strong>

                    {p.willEat ? (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          width: "90px",
                          height: "20px",
                          padding: "6px 6px",
                          borderRadius: 12,
                          fontWeight: 700,
                          fontSize: 16,
                          background:
                            p.mealType === "salad" ? "#DCFCE7" : "#FCE7F3",
                          color:
                            p.mealType === "salad" ? "#15803D" : "#DB2777",
                        }}
                      >
                        <span style={{ fontSize: 18 }}>
                          {p.mealType === "salad" ? "🥗" : "🍚"}
                        </span>
                        {p.mealType === "salad" ? "샐러드" : "일반식"}
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "90px",
                          height: "20px",
                          padding: "6px 6px",
                          borderRadius: 12,
                          background: "#F3F4F6",
                          color: "#374151",
                          fontWeight: 700,
                          fontSize: 16,
                        }}
                      >
                        ❌
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <button onClick={() => goTrip(p.id)}>출장✈️</button>|
                  <button onClick={() => selectMeal(p.id, "normal")}>
                    일반식🍚
                  </button>
                  <button onClick={() => selectMeal(p.id, "salad")}>
                    샐러드🥗
                  </button>
                  <button onClick={() => cancelMeal(p.id)}>안먹어요❌</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: 26 }}>
        <h2 style={{ margin: "14px 0 10px" }}>출장 간 인원</h2>

        <div
          style={{
            opacity: 0.7,
            fontSize: 14,
            marginTop: 10,
            marginBottom: 10,
          }}
        >
          출장자는 식사 인원 계산에서 제외됩니다.
        </div>

        {tripPeople.length === 0 ? (
          <div style={{ opacity: 0.7 }}>출장 중인 인원이 없습니다.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {tripPeople.map((p) => (
              <li
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  marginBottom: 10,
                }}
              >
                <strong>{p.name}</strong>
                <button onClick={() => returnFromTrip(p.id)}>
                  출장 복귀
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default App;